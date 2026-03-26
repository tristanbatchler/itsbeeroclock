package aws

import (
	"context"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
)

var Router ApiProxyGatewayHandler = func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Public routes
	if req.Path == "/api/health" && req.HTTPMethod == "GET" {
		return HealthHandler(ctx, req)
	}

	// Protected routes
	return WithAuth(func(ctx context.Context, authCtx *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		switch {
		case req.Path == "/api/drinks" && req.HTTPMethod == "POST":
			return AddDrinkHandler(ctx, req)
		default:
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusNotFound,
				Body:       `{"error": "route not found"}`,
			}, nil
		}
	})(ctx, req)
}
