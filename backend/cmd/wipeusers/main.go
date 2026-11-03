// wipeusers deletes all user data at the Google sign-in cutover, keeping the beer
// catalogue. It's a dry run unless passed -execute. See "Cutover" in README.md.
package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	beerAws "github.com/tristanbatchler/itsbeeroclock/backend/internal/api"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

const (
	dynamoBatchSize = 25
	maxBatchRetries = 8
	uploadsPrefix   = "custom/"
)

// isUserDataKey is the single rule for what the wipe may delete.
func isUserDataKey(pk string) bool {
	return strings.HasPrefix(pk, beerAws.PrefixUser)
}

type scanResult struct {
	userKeys       []map[string]types.AttributeValue
	catalogueItems int
	otherItems     int
}

func scanTable(ctx context.Context, db *dynamodb.Client, table *string) (scanResult, error) {
	var result scanResult
	input := &dynamodb.ScanInput{
		TableName:                table,
		ProjectionExpression:     aws.String("#pk, #sk"),
		ExpressionAttributeNames: map[string]string{"#pk": "PK", "#sk": "SK"},
	}
	for {
		out, err := db.Scan(ctx, input)
		if err != nil {
			return result, err
		}
		for _, item := range out.Items {
			pk, ok := item["PK"].(*types.AttributeValueMemberS)
			switch {
			case ok && isUserDataKey(pk.Value):
				result.userKeys = append(result.userKeys, item)
			case ok && pk.Value == beerAws.KeyCatalog:
				result.catalogueItems++
			default:
				result.otherItems++
			}
		}
		if len(out.LastEvaluatedKey) == 0 {
			return result, nil
		}
		input.ExclusiveStartKey = out.LastEvaluatedKey
	}
}

func deleteItems(ctx context.Context, db *dynamodb.Client, table *string, keys []map[string]types.AttributeValue) error {
	for start := 0; start < len(keys); start += dynamoBatchSize {
		end := min(start+dynamoBatchSize, len(keys))
		requests := make([]types.WriteRequest, 0, end-start)
		for _, key := range keys[start:end] {
			requests = append(requests, types.WriteRequest{DeleteRequest: &types.DeleteRequest{Key: key}})
		}

		pending := map[string][]types.WriteRequest{*table: requests}
		for attempt := 0; len(pending) > 0; attempt++ {
			if attempt == maxBatchRetries {
				return fmt.Errorf("items still unprocessed after %d retries", maxBatchRetries)
			}
			if attempt > 0 {
				time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
			}
			out, err := db.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{RequestItems: pending})
			if err != nil {
				return err
			}
			pending = out.UnprocessedItems
		}
	}
	return nil
}

func listUploads(ctx context.Context, client *s3.Client, bucket string) ([]string, error) {
	var keys []string
	paginator := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String(uploadsPrefix),
	})
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, object := range page.Contents {
			keys = append(keys, *object.Key)
		}
	}
	return keys, nil
}

func deleteUploads(ctx context.Context, client *s3.Client, bucket string, keys []string) error {
	const s3BatchSize = 1000
	for start := 0; start < len(keys); start += s3BatchSize {
		end := min(start+s3BatchSize, len(keys))
		objects := make([]s3types.ObjectIdentifier, 0, end-start)
		for _, key := range keys[start:end] {
			objects = append(objects, s3types.ObjectIdentifier{Key: aws.String(key)})
		}
		out, err := client.DeleteObjects(ctx, &s3.DeleteObjectsInput{
			Bucket: aws.String(bucket),
			Delete: &s3types.Delete{Objects: objects},
		})
		if err != nil {
			return err
		}
		if len(out.Errors) > 0 {
			return fmt.Errorf("%d objects weren't deleted, first: %s", len(out.Errors), aws.ToString(out.Errors[0].Message))
		}
	}
	return nil
}

func main() {
	prod := flag.Bool("prod", false, "use the real DynamoDB table and S3 bucket instead of DynamoDB Local")
	execute := flag.Bool("execute", false, "really delete. Without this it's a dry run")
	flag.Parse()
	beerAws.RequireLocalDynamoDB(*prod)

	ctx := context.Background()
	db, err := beerAws.NewDynamoClient(ctx)
	if err != nil {
		log.Fatal(err)
	}
	table := beerAws.TableName()

	result, err := scanTable(ctx, db, table)
	if err != nil {
		log.Fatalf("scanning %s: %v", *table, err)
	}

	// DynamoDB Local thumbnails stay in the table, so a local run never touches S3.
	var s3Client *s3.Client
	var bucket string
	var uploads []string
	if *prod {
		bucket = utils.GetVar("S3_BUCKET")
		if bucket == "" {
			log.Fatal("S3_BUCKET is required with -prod")
		}
		cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion("ap-southeast-2"))
		if err != nil {
			log.Fatal(err)
		}
		s3Client = s3.NewFromConfig(cfg)
		uploads, err = listUploads(ctx, s3Client, bucket)
		if err != nil {
			log.Fatalf("listing s3://%s/%s: %v", bucket, uploadsPrefix, err)
		}
	}

	fmt.Printf("Table:                %s\n", *table)
	if *prod {
		fmt.Printf("Bucket:               %s\n", bucket)
	} else {
		fmt.Println("Bucket:               none (DynamoDB Local)")
	}
	fmt.Printf("User items to delete: %d\n", len(result.userKeys))
	fmt.Printf("S3 objects to delete: %d\n", len(uploads))
	fmt.Printf("Catalogue items kept: %d\n", result.catalogueItems)
	fmt.Printf("Other items kept:     %d\n", result.otherItems)

	if !*execute {
		fmt.Println("\nDry run: nothing was deleted. Pass -execute to delete.")
		return
	}

	fmt.Printf("\nThis can't be undone. Type the table name to delete: ")
	answer, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	if strings.TrimSpace(answer) != *table {
		log.Fatal("That doesn't match the table name, so nothing was deleted.")
	}

	if err := deleteItems(ctx, db, table, result.userKeys); err != nil {
		log.Fatalf("deleting items: %v", err)
	}
	fmt.Printf("Deleted %d user items.\n", len(result.userKeys))

	if s3Client != nil {
		if err := deleteUploads(ctx, s3Client, bucket, uploads); err != nil {
			log.Fatalf("deleting S3 objects: %v", err)
		}
		fmt.Printf("Deleted %d S3 objects.\n", len(uploads))
	}

	after, err := scanTable(ctx, db, table)
	if err != nil {
		log.Fatalf("checking the table afterwards: %v", err)
	}
	fmt.Printf("Now: %d user items, %d catalogue items.\n", len(after.userKeys), after.catalogueItems)
}
