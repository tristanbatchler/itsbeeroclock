package aws

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
)

type response struct {
	Message string `json:"message"`
}

var HealthHandler ApiProxyGatewayHandler = func(ctx context.Context, apr events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	body, err := json.Marshal(response{Message: "Beer O'Clock is healthy!"})
	if err != nil {
		return events.APIGatewayProxyResponse{}, err
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}
