package aws

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-lambda-go/events"
)

type AuthContext struct {
	UserID string
}

func VerifyJWT(tokenString string) (*AuthContext, error) {
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	// For now, return a placeholder
	return &AuthContext{UserID: "test-user"}, nil
}

func WithAuth(handler func(context.Context, *AuthContext, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)) ApiProxyGatewayHandler {
	return func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		authHeader := req.Headers["Authorization"]
		if authHeader == "" {
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusUnauthorized,
				Body:       `{"error": "missing authorization header"}`,
			}, nil
		}

		authCtx, err := VerifyJWT(authHeader)
		if err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusUnauthorized,
				Body:       fmt.Sprintf(`{"error": "%s"}`, err.Error()),
			}, nil
		}

		return handler(ctx, authCtx, req)
	}
}
