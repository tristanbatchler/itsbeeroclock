package api

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

// SyncDrinksHandler replaces the user's current drink set with the provided
// array. It first deletes all existing DRINK# items for the user, then saves
// the new ones. This ensures the server always mirrors the client — stale
// drinks from archived sessions can never leak back on re-login.
var SyncDrinksHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	log.Printf("SyncDrinks for user: %s (%s)", authCtx.UserID, authCtx.Email)

	var drinks []models.DrinkRecord
	if err := json.Unmarshal([]byte(req.Body), &drinks); err != nil {
		return ErrorResponse(400, "invalid request body")
	}

	pk := UserPK(authCtx.UserID)

	// 1. Query all existing DRINK# items for this user.
	var existingKeys []map[string]types.AttributeValue
	var lastKey map[string]types.AttributeValue
	for {
		out, err := dbClient.Query(ctx, &dynamodb.QueryInput{
			TableName:              TableName(),
			KeyConditionExpression: aws.String("PK = :pk AND begins_with(SK, :prefix)"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":pk":     &types.AttributeValueMemberS{Value: pk},
				":prefix": &types.AttributeValueMemberS{Value: PrefixDrink},
			},
			ProjectionExpression: aws.String("PK, SK"),
			ExclusiveStartKey:    lastKey,
		})
		if err != nil {
			log.Printf("SyncDrinks: failed to query existing drinks for user %s: %v", authCtx.UserID, err)
			return ErrorResponse(500, "failed to query existing drinks")
		}
		existingKeys = append(existingKeys, out.Items...)
		lastKey = out.LastEvaluatedKey
		if len(lastKey) == 0 {
			break
		}
	}

	// 2. Batch-delete existing drinks in chunks of 25 (DynamoDB limit).
	tableName := *TableName()
	for i := 0; i < len(existingKeys); i += 25 {
		end := i + 25
		if end > len(existingKeys) {
			end = len(existingKeys)
		}
		var reqs []types.WriteRequest
		for _, key := range existingKeys[i:end] {
			reqs = append(reqs, types.WriteRequest{
				DeleteRequest: &types.DeleteRequest{Key: key},
			})
		}
		if _, err := dbClient.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{
			RequestItems: map[string][]types.WriteRequest{tableName: reqs},
		}); err != nil {
			log.Printf("SyncDrinks: batch delete failed for user %s: %v", authCtx.UserID, err)
			return ErrorResponse(500, "failed to delete existing drinks")
		}
	}

	// 3. Save the new drinks.
	var failed int
	for _, drink := range drinks {
		if drink.ID == "" || drink.BeerID == "" || drink.Size == "" || drink.Timestamp == 0 {
			log.Printf("SyncDrinks: skipping invalid drink for user %s: %+v", authCtx.UserID, drink)
			failed++
			continue
		}
		if err := SaveDrink(ctx, authCtx.UserID, drink); err != nil {
			log.Printf("SyncDrinks: failed to save drink for user %s: %v", authCtx.UserID, err)
			failed++
		}
	}

	msg := "Drinks synced successfully"
	if failed > 0 {
		msg = "Some drinks failed to sync"
	}
	return JSONResponse(200, AppResponse{Message: msg})
}
