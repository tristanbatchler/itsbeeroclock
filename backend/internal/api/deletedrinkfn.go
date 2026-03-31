package api

import (
	"context"
	"fmt"
	"net/http"
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
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusBadRequest,
			Body:       `{"error":"missing id or ts parameter"}`,
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, nil
	}

	timestamp, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusBadRequest,
			Body:       `{"error":"invalid timestamp"}`,
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, nil
	}

	pk := fmt.Sprintf("USER#%s", authCtx.UserID)
	sk := fmt.Sprintf("DRINK#%d#%s", timestamp, drinkID)

	_, err = dbClient.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: TableName(),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})

	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       `{"error":"failed to delete drink"}`,
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, err
	}

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       `{"message":"drink deleted"}`,
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}
