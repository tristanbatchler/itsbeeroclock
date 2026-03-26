package aws

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
)

var AddDrinkHandler ApiProxyGatewayHandler = WithAuth(func(ctx context.Context, authCtx *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("Received AddDrink request for user %s with body: %s", authCtx.UserID, req.Body)
	body, err := json.Marshal(AppResponse{Message: "Drink added successfully!"})
	if err != nil {
		return events.APIGatewayProxyResponse{}, err
	}
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "text/plain"},
	}, nil
})
