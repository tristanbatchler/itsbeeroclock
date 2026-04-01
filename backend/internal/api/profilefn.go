package api

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var GetProfileHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	pk := UserPK(authCtx.UserID)
	sk := KeyProfile
	out, err := dbClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: TableName(),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})
	if err != nil {
		log.Printf("GetProfileHandler: failed to get profile for user %s: %v", authCtx.UserID, err)
		return ErrorResponse(500, "Failed to get profile")
	}
	if out.Item == nil {
		// Return sensible defaults (ABS average Australian male)
		profile := models.UserProfile{
			Weight:           80,
			Height:           175,
			Age:              35,
			Sex:              "male",
			OptInHistory:     true,
			FavouriteBeerIDs: []string{},
		}
		return JSONResponse(200, profile)
	}
	var profile models.UserProfile
	err = attributevalue.UnmarshalMap(out.Item, &profile)
	if err != nil {
		log.Printf("GetProfileHandler: failed to unmarshal profile for user %s: %v", authCtx.UserID, err)
		return ErrorResponse(500, "Failed to unmarshal profile")
	}
	return JSONResponse(200, profile)
}

var UpdateProfileHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	pk := UserPK(authCtx.UserID)
	sk := KeyProfile
	var profile models.UserProfile
	if err := json.Unmarshal([]byte(req.Body), &profile); err != nil {
		return ErrorResponse(400, "Invalid profile data")
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
		log.Printf("UpdateProfileHandler: failed to marshal profile for user %s: %v", authCtx.UserID, err)
		return ErrorResponse(500, "Failed to marshal profile")
	}
	_, err = dbClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: TableName(),
		Item:      item,
	})
	if err != nil {
		log.Printf("UpdateProfileHandler: failed to save profile for user %s: %v", authCtx.UserID, err)
		return ErrorResponse(500, "Failed to save profile")
	}
	return JSONResponse(200, map[string]bool{"success": true})
}

var ClearUserDataHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	pk := UserPK(authCtx.UserID)

	// 1. Query ALL items for this user (Profile, Drinks, Custom Beers, and History).
	// The KeyConditionExpression "PK = :pk" has no SK filter, so it returns every item
	// under this user's partition key — including HISTORY# SK items (Requirement 7.2).
	var allItems []map[string]types.AttributeValue
	var lastKey map[string]types.AttributeValue

	for {
		out, err := dbClient.Query(ctx, &dynamodb.QueryInput{
			TableName:              TableName(),
			KeyConditionExpression: aws.String("PK = :pk"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":pk": &types.AttributeValueMemberS{Value: pk},
			},
			ExclusiveStartKey: lastKey,
		})
		if err != nil {
			log.Printf("ClearUserDataHandler: failed to query items for user %s: %v", authCtx.UserID, err)
			return ErrorResponse(500, "Failed to query user data for deletion")
		}
		allItems = append(allItems, out.Items...)
		lastKey = out.LastEvaluatedKey
		if len(lastKey) == 0 {
			break
		}
	}

	// 2. Batch Delete in chunks of 25 (DynamoDB limit)
	tableName := *TableName()
	for i := 0; i < len(allItems); i += 25 {
		end := i + 25
		if end > len(allItems) {
			end = len(allItems)
		}

		var writeRequests []types.WriteRequest
		for _, item := range allItems[i:end] {
			writeRequests = append(writeRequests, types.WriteRequest{
				DeleteRequest: &types.DeleteRequest{
					Key: map[string]types.AttributeValue{
						"PK": item["PK"],
						"SK": item["SK"],
					},
				},
			})
		}

		batchOut, err := dbClient.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{
			RequestItems: map[string][]types.WriteRequest{
				tableName: writeRequests,
			},
		})
		if err != nil {
			log.Printf("ClearUserDataHandler: batch delete failed for user %s: %v", authCtx.UserID, err)
			return ErrorResponse(500, "Failed to complete batch deletion")
		}
		if len(batchOut.UnprocessedItems) > 0 {
			log.Printf("ClearUserDataHandler: %d unprocessed items for user %s", len(batchOut.UnprocessedItems[tableName]), authCtx.UserID)
			return ErrorResponse(500, "Failed to delete all user data")
		}
	}

	return SuccessResponse(map[string]bool{"success": true})
}
