package aws

import (
	"context"
	"log"
	"runtime/debug"

	"github.com/aws/aws-lambda-go/events"
)

var Router ApiProxyGatewayHandler = func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic recovered: %v\nStack trace:\n%s", r, debug.Stack())
		}
	}()

	log.Printf("=== FULL REQUEST ===")
	log.Printf("Method: %s", req.HTTPMethod)
	log.Printf("Path: %s", req.Path)
	log.Printf("Resource: %s", req.Resource)
	log.Printf("Stage: %s", req.RequestContext.Stage)
	log.Printf("===================")

	// Public routes
	if req.Path == "/api/health" && req.HTTPMethod == "GET" {
		log.Printf("Matched /api/health route")
		return HealthHandler(ctx, req)
	}

	// Protected routes
	return WithAuth(func(ctx context.Context, authCtx *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		switch {
		case req.Path == "/api/drinks" && req.HTTPMethod == "POST":
			log.Printf("Matched POST /api/drinks route for userID: %s", authCtx.UserID)
			return AddDrinkHandler(ctx, authCtx, req)
		default:
			return events.APIGatewayProxyResponse{
				StatusCode: 404,
				Body:       `{"error": "not found", "path": "` + req.Path + `"}`,
				Headers:    map[string]string{"Content-Type": "application/json"},
			}, nil
		}
	})(ctx, req)
}
