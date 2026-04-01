package api

import (
	"context"
	"log"
	"net/http"
	"sort"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var GetHistoryHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	records := make([]models.HistoryRecord, 0)

	var lastKey map[string]types.AttributeValue
	for {
		input := &dynamodb.QueryInput{
			TableName:              TableName(),
			KeyConditionExpression: aws.String("PK = :pk AND begins_with(SK, :prefix)"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":pk":     &types.AttributeValueMemberS{Value: UserPK(authCtx.UserID)},
				":prefix": &types.AttributeValueMemberS{Value: PrefixHistory},
			},
		}
		if lastKey != nil {
			input.ExclusiveStartKey = lastKey
		}

		out, err := dbClient.Query(ctx, input)
		if err != nil {
			log.Printf("GetHistoryHandler: failed to query history for user %s: %v", authCtx.UserID, err)
			return ErrorResponse(http.StatusInternalServerError, "failed to query history")
		}

		for _, item := range out.Items {
			var record models.HistoryRecord
			if err := attributevalue.UnmarshalMap(item, &record); err != nil {
				log.Printf("GetHistoryHandler: failed to unmarshal history item for user %s: %v", authCtx.UserID, err)
				return ErrorResponse(http.StatusInternalServerError, "failed to unmarshal history item")
			}
			records = append(records, record)
		}

		if out.LastEvaluatedKey == nil {
			break
		}
		lastKey = out.LastEvaluatedKey
	}

	sort.Slice(records, func(i, j int) bool {
		return records[i].StartTimestamp > records[j].StartTimestamp
	})

	return JSONResponse(http.StatusOK, records)
}
