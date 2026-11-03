package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

var s3Client *s3.Client

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("s3: failed to load AWS config: %v", err)
	}
	s3Client = s3.NewFromConfig(cfg)
}

// CustomBeerThumbKey is the S3 object key of a custom beer's thumbnail.
func CustomBeerThumbKey(userID, beerID string) string {
	return fmt.Sprintf("custom/%s/%s/thumb.webp", userID, beerID)
}

// DeleteThumbnails removes objects from S3. Keys that don't exist aren't an error.
// With DynamoDB Local it does nothing, because thumbnails never went to S3.
func DeleteThumbnails(ctx context.Context, keys []string) error {
	if LocalDynamoDBEndpoint() != "" || len(keys) == 0 {
		return nil
	}

	const s3BatchSize = 1000
	bucket := utils.GetVar("S3_BUCKET")
	for start := 0; start < len(keys); start += s3BatchSize {
		end := min(start+s3BatchSize, len(keys))
		objects := make([]s3types.ObjectIdentifier, 0, end-start)
		for _, key := range keys[start:end] {
			objects = append(objects, s3types.ObjectIdentifier{Key: aws.String(key)})
		}
		out, err := s3Client.DeleteObjects(ctx, &s3.DeleteObjectsInput{
			Bucket: aws.String(bucket),
			Delete: &s3types.Delete{Objects: objects},
		})
		if err != nil {
			return fmt.Errorf("S3 DeleteObjects failed: %w", err)
		}
		if len(out.Errors) > 0 {
			return fmt.Errorf("S3 DeleteObjects left %d objects", len(out.Errors))
		}
	}
	return nil
}

// UploadThumbnail decodes a base64 WebP data URL and writes it to S3.
// Returns the public HTTPS URL of the stored object.
// key should be a full S3 object key, e.g. "custom/{userID}/{beerID}/thumb.webp".
// With DynamoDB Local it skips S3 and returns the data URL, so local dev never
// writes to the real bucket.
func UploadThumbnail(ctx context.Context, base64DataURL string, key string) (string, error) {
	if LocalDynamoDBEndpoint() != "" {
		return base64DataURL, nil
	}

	// Strip the data URL prefix ("data:image/webp;base64,")
	parts := strings.SplitN(base64DataURL, ",", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid base64 data URL")
	}

	imgBytes, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("base64 decode failed: %w", err)
	}

	bucket := utils.GetVar("S3_BUCKET")
	_, err = s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(bucket),
		Key:          aws.String(key),
		Body:         bytes.NewReader(imgBytes),
		ContentType:  aws.String("image/webp"),
		CacheControl: aws.String("public, max-age=31536000"),
	})
	if err != nil {
		return "", fmt.Errorf("S3 PutObject failed: %w", err)
	}

	region := utils.GetVar("AWS_REGION")
	if region == "" {
		region = "ap-southeast-2"
	}
	// Serve via CloudFront if available, otherwise fall back to direct S3 URL
	cfDomain := utils.GetVar("APP_DOMAIN_NAME")
	var url string
	if cfDomain != "" {
		url = fmt.Sprintf("https://%s/%s", cfDomain, key)
	} else {
		url = fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key)
	}
	return url, nil
}
