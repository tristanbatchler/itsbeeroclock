package api

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var AddDrinkHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	log.Printf("AddDrink by user: %s (%s)", authCtx.UserID, authCtx.Email)
	log.Printf("Request body: %s", req.Body)

	// Parse request
	var drinkRecord models.DrinkRecord

	if err := json.Unmarshal([]byte(req.Body), &drinkRecord); err != nil {
		return ErrorResponse(400, "invalid request body")
	}

	// Save to DynamoDB
	if err := SaveDrink(ctx, authCtx.UserID, drinkRecord); err != nil {
		log.Printf("Error saving drink: %v", err)
		return ErrorResponse(500, "failed to save drink")
	}

	return JSONResponse(201, AppResponse{Message: "Drink added successfully!"})
}
