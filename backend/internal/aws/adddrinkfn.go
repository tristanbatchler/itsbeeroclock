// backend/internal/aws/adddrinkfn.go
package aws

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
)

var AddDrinkHandler ApiProxyGatewayHandler = func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// AuthContext is passed via the router's WithAuth – you can extract it if needed
	// For now, just handle the request
	log.Printf("Received AddDrink request with body: %s", req.Body)

	body, err := json.Marshal(AppResponse{Message: "Drink added successfully!"})
	if err != nil {
		return events.APIGatewayProxyResponse{}, err
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}
