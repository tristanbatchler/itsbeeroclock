package api

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

// SyncDrinksHandler: Accepts an array of drinks and saves them for the user (session sync on login)
var SyncDrinksHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	log.Printf("SyncDrinks for user: %s (%s)", authCtx.UserID, authCtx.Email)
	log.Printf("Request body: %s", req.Body)

	var drinks []models.DrinkRecord
	if err := json.Unmarshal([]byte(req.Body), &drinks); err != nil {
		return ErrorResponse(400, "invalid request body")
	}

	var failed int
	for _, drink := range drinks {
		if err := SaveDrink(ctx, authCtx.UserID, drink); err != nil {
			log.Printf("Failed to save drink: %+v, err: %v", drink, err)
			failed++
		}
	}

	resp := AppResponse{Message: "Drinks synced successfully!"}
	if failed > 0 {
		resp.Message = "Some drinks failed to sync"
	}
	return JSONResponse(200, resp)
}
