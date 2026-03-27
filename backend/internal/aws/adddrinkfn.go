package aws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

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
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusBadRequest,
			Body:       `{"error": "invalid request body"}`,
		}, err
	}

	// Save to DynamoDB
	if err := SaveDrink(ctx, authCtx.UserID, drinkRecord); err != nil {
		log.Printf("Error saving drink: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       `{"error": "failed to save drink"}`,
		}, err
	}

	respBody, _ := json.Marshal(AppResponse{Message: "Drink added successfully!"})
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusCreated,
		Body:       string(respBody),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}
