package aws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var GetBeersHandler ApiProxyGatewayHandler = func(ctx context.Context, apr events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	out, err := dbClient.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(os.Getenv("TABLE_NAME")),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("GSI1PK = :pk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: "CATALOGUE"},
		},
	})
	if err != nil {
		log.Printf("Error querying beers: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       `{"error": "failed to query beers"}`,
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, err
	}

	var beers []models.Beer
	for _, item := range out.Items {
		var beer models.Beer
		err := attributevalue.UnmarshalMap(item, &beer)
		if err != nil {
			log.Printf("Error unmarshaling beer item: %v", err)
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusInternalServerError,
				Body:       `{"error": "failed to unmarshal beer item"}`,
				Headers:    map[string]string{"Content-Type": "application/json"},
			}, err
		}
		beers = append(beers, beer)
	}

	body, err := json.Marshal(beers)
	if err != nil {
		log.Printf("Error marshaling beers: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       `{"error": "failed to marshal beers"}`,
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, err
	}

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}
