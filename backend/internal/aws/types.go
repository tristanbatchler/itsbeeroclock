package aws

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
)

type ApiProxyGatewayHandler func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

type AuthContext struct {
	UserID string
	Email  string
}

type AuthenticatedApiProxyGatewayHandler func(context.Context, *AuthContext, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

type AppResponse struct {
	Message string `json:"message"`
}
