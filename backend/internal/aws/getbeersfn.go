package aws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var GetBeersHandler ApiProxyGatewayHandler = func(ctx context.Context, apr events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	limit := int32(30)
	if l := apr.QueryStringParameters["limit"]; l != "" {
		if parsed, err := strconv.ParseInt(l, 10, 32); err == nil && parsed > 0 {
			limit = int32(parsed)
		}
	}

	input := &dynamodb.QueryInput{
		TableName:              TableName(),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("GSI1PK = :pk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: "CATALOGUE"},
		},
		Limit: aws.Int32(limit),
	}

	if lastKeyStr := apr.QueryStringParameters["lastKey"]; lastKeyStr != "" {
		var lastKeyRaw map[string]interface{}
		if err := json.Unmarshal([]byte(lastKeyStr), &lastKeyRaw); err == nil {
			if lastKey, err := attributevalue.MarshalMap(lastKeyRaw); err == nil {
				input.ExclusiveStartKey = lastKey
			}
		}
	}

	if search := strings.ToLower(apr.QueryStringParameters["search"]); search != "" {
		input.FilterExpression = aws.String(
			"contains(#nm, :search) OR contains(#br, :search)",
		)
		input.ExpressionAttributeNames = map[string]string{
			"#nm": "Name",
			"#br": "Brewery",
		}
		input.ExpressionAttributeValues[":search"] = &types.AttributeValueMemberS{Value: search}
	}

	out, err := dbClient.Query(ctx, input)
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
		if err := attributevalue.UnmarshalMap(item, &beer); err != nil {
			log.Printf("Error unmarshaling beer item: %v", err)
			continue
		}
		if skVal, ok := item["SK"].(*types.AttributeValueMemberS); ok {
			beer.ID = strings.TrimPrefix(skVal.Value, "BEER#")
		}
		beers = append(beers, beer)
	}

	response := map[string]interface{}{
		"beers":   beers,
		"hasMore": out.LastEvaluatedKey != nil,
	}
	if out.LastEvaluatedKey != nil {
		var lastKeyRaw map[string]interface{}
		if err := attributevalue.UnmarshalMap(out.LastEvaluatedKey, &lastKeyRaw); err == nil {
			cursorBytes, _ := json.Marshal(lastKeyRaw)
			response["lastKey"] = string(cursorBytes)
		}
	}

	body, err := json.Marshal(response)
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
