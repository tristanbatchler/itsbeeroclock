package aws

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

func GetProfileHandler(ctx context.Context, authCtx *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	pk := "USER#" + authCtx.UserID
	sk := "PROFILE"
	out, err := dbClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: TableName(),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})
	if err != nil || out.Item == nil {
		// Return sensible default if not found
		profile := models.UserProfile{
			Weight:           80,
			Gender:           "male",
			OptInHistory:     true,
			FavouriteBeerIDs: []string{},
		}
		body, _ := json.Marshal(profile)
		return events.APIGatewayProxyResponse{StatusCode: 200, Body: string(body)}, nil
	}
	var profile models.UserProfile
	err = attributevalue.UnmarshalMap(out.Item, &profile)
	if err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: `{"error": "Failed to unmarshal profile"}`}, nil
	}
	body, _ := json.Marshal(profile)
	return events.APIGatewayProxyResponse{StatusCode: 200, Body: string(body)}, nil
}

func UpdateProfileHandler(ctx context.Context, authCtx *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	pk := "USER#" + authCtx.UserID
	sk := "PROFILE"
	var profile models.UserProfile
	if err := json.Unmarshal([]byte(req.Body), &profile); err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 400, Body: `{"error": "Invalid profile data"}`}, nil
	}
	item, err := attributevalue.MarshalMap(struct {
		PK string
		SK string
		models.UserProfile
	}{
		PK:          pk,
		SK:          sk,
		UserProfile: profile,
	})
	if err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: `{"error": "Failed to marshal profile"}`}, nil
	}
	_, err = dbClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: TableName(),
		Item:      item,
	})
	if err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: `{"error": "Failed to save profile"}`}, nil
	}
	return events.APIGatewayProxyResponse{StatusCode: 200, Body: `{"success": true}`}, nil
}
