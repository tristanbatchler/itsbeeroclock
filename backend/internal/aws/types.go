package aws

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
)

type ApiProxyGatewayHandler func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

type AppResponse struct {
	Message string `json:"message"`
}
