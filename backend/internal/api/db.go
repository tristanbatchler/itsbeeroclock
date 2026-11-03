package api

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var dbClient *dynamodb.Client

func init() {
	client, err := NewDynamoClient(context.Background())
	if err != nil {
		panic("unable to load SDK config: " + err.Error())
	}
	dbClient = client
}

// NewDynamoClient connects to DynamoDB Local when DYNAMODB_ENDPOINT is set.
// It uses dummy credentials there, so a local client can't authenticate to AWS.
func NewDynamoClient(ctx context.Context) (*dynamodb.Client, error) {
	endpoint := LocalDynamoDBEndpoint()
	opts := []func(*config.LoadOptions) error{config.WithRegion("ap-southeast-2")}
	if endpoint != "" {
		opts = append(opts, config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider("local", "local", ""),
		))
	}
	cfg, err := config.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, err
	}
	return dynamodb.NewFromConfig(cfg, func(o *dynamodb.Options) {
		if endpoint != "" {
			o.BaseEndpoint = aws.String(endpoint)
		}
	}), nil
}

func SaveDrink(ctx context.Context, userID string, drinkRecord models.DrinkRecord) error {
	drinkRecord.PK = UserPK(userID)
	// Use the ID from frontend to prevent duplicates
	drinkRecord.SK = DrinkSK(drinkRecord.Timestamp, drinkRecord.ID)

	av, err := attributevalue.MarshalMap(drinkRecord)
	if err != nil {
		return err
	}

	_, err = dbClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: TableName(),
		Item:      av,
	})
	return err
}
