package api

import (
	"context"
	"log"
	"strconv"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var DeleteDrinkHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	drinkID := req.QueryStringParameters["id"]
	tsStr := req.QueryStringParameters["ts"]

	if drinkID == "" || tsStr == "" {
		return ErrorResponse(400, "missing id or ts parameter")
	}

	timestamp, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return ErrorResponse(400, "invalid timestamp")
	}

	pk := UserPK(authCtx.UserID)
	sk := DrinkSK(timestamp, drinkID)

	_, err = dbClient.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: TableName(),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})

	if err != nil {
		log.Printf("DeleteDrinkHandler: failed to delete drink %s for user %s: %v", drinkID, authCtx.UserID, err)
		return ErrorResponse(500, "failed to delete drink")
	}

	return JSONResponse(200, map[string]string{"message": "drink deleted"})
}
