package aws

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/golang-jwt/jwt/v5"
)

func getJWKS() ([]byte, error) {
	// TODO: Eventually fetch and cache the JWKS endpoint
	secret := os.Getenv("SUPABASE_JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("SUPABASE_JWT_SECRET not set")
	}
	return []byte(secret), nil
}

func VerifyJWT(tokenString string) (*AuthContext, error) {
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	secret, err := getJWKS()
	if err != nil {
		return nil, err
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID, ok := claims["sub"].(string)
		if !ok {
			return nil, fmt.Errorf("no sub claim")
		}
		email, _ := claims["email"].(string)

		return &AuthContext{
			UserID: userID,
			Email:  email,
		}, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func WithAuth(handler AuthenticatedApiProxyGatewayHandler) ApiProxyGatewayHandler {
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
				Body:       fmt.Sprintf(`{"error": "invalid token: %s"}`, err.Error()),
			}, nil
		}

		return handler(ctx, authCtx, req)
	}
}
