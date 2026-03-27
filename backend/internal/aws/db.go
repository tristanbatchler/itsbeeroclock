package aws

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var dbClient *dynamodb.Client

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion("ap-southeast-2"))
	if err != nil {
		panic("unable to load SDK config: " + err.Error())
	}
	dbClient = dynamodb.NewFromConfig(cfg)
}

func SaveDrink(ctx context.Context, userID string, drinkRecord models.DrinkRecord) error {
	drinkRecord.PK = fmt.Sprintf("USER#%s", userID)
	drinkRecord.SK = fmt.Sprintf("DRINK#%d", drinkRecord.Timestamp)

	av, err := attributevalue.MarshalMap(drinkRecord)
	if err != nil {
		return err
	}

	_, err = dbClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(os.Getenv("TABLE_NAME")),
		Item:      av,
	})
	return err
}
