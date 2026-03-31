package api

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var GetDrinksHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	out, err := dbClient.Query(ctx, &dynamodb.QueryInput{
		TableName:              TableName(),
		KeyConditionExpression: aws.String("PK = :pk AND begins_with(SK, :sk)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: UserPK(authCtx.UserID)},
			":sk": &types.AttributeValueMemberS{Value: PrefixDrink},
		},
	})
	if err != nil {
		return ErrorResponse(500, "failed to query drinks")
	}

	drinks := make([]models.DrinkRecord, 0)
	for _, item := range out.Items {
		var drink models.DrinkRecord
		err := attributevalue.UnmarshalMap(item, &drink)
		if err != nil {
			return ErrorResponse(500, "failed to unmarshal drink item")
		}
		drinks = append(drinks, drink)
	}

	return JSONResponse(200, drinks)
}
