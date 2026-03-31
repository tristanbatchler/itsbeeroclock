package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

type addCustomBeerRequest struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Brewery string  `json:"brewery"`
	ABV     float64 `json:"abv"`
	Image   string  `json:"image,omitempty"` // base64 data URL
}

var AddCustomBeerHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	var body addCustomBeerRequest
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		return ErrorResponse(400, "invalid request body")
	}

	if body.Name == "" || body.ABV <= 0 {
		return ErrorResponse(400, "name and abv are required")
	}
	if body.ID == "" {
		return ErrorResponse(400, "id is required")
	}

	beer := models.Beer{
		ID:       body.ID,
		Name:     body.Name,
		Brewery:  body.Brewery,
		ABV:      body.ABV,
		IsCustom: true,
	}

	if body.Image != "" {
		key := fmt.Sprintf("custom/%s/%s/thumb.webp", authCtx.UserID, body.ID)
		url, err := UploadThumbnail(ctx, body.Image, key)
		if err != nil {
			log.Printf("AddCustomBeerHandler: thumbnail upload failed for %s: %v", body.ID, err)
		} else {
			beer.Image = url
		}
	}

	item, err := attributevalue.MarshalMap(beer)
	if err != nil {
		return ErrorResponse(500, "failed to marshal custom beer")
	}

	item["PK"] = &types.AttributeValueMemberS{Value: UserPK(authCtx.UserID)}
	item["SK"] = &types.AttributeValueMemberS{Value: CustomBeerSK(beer.ID)}

	_, err = dbClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: TableName(),
		Item:      item,
	})
	if err != nil {
		log.Printf("AddCustomBeerHandler: DynamoDB error: %v", err)
		return ErrorResponse(500, "failed to save custom beer")
	}

	return JSONResponse(201, beer)
}

var GetCustomBeersHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	out, err := dbClient.Query(ctx, &dynamodb.QueryInput{
		TableName:              TableName(),
		KeyConditionExpression: aws.String("PK = :pk AND begins_with(SK, :sk)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: UserPK(authCtx.UserID)},
			":sk": &types.AttributeValueMemberS{Value: PrefixCustomBeer},
		},
	})
	if err != nil {
		return ErrorResponse(500, "failed to query custom beers")
	}

	var beers []models.Beer
	for _, item := range out.Items {
		var beer models.Beer
		if err := attributevalue.UnmarshalMap(item, &beer); err != nil {
			continue
		}
		beer.IsCustom = true
		beers = append(beers, beer)
	}

	return JSONResponse(200, beers)
}
