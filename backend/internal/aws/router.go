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

	// Public routes
	switch {
	case req.Path == "/api/health" && req.HTTPMethod == "GET":
		log.Printf("Matched /api/health route")
		return HealthHandler(ctx, req)
	case req.Path == "/api/beers" && req.HTTPMethod == "GET":
		log.Printf("Matched GET /api/beers route")
		return GetBeersHandler(ctx, req)
	}

	// Protected routes
	return WithAuth(func(ctx context.Context, authCtx *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		switch {
		case req.Path == "/api/drinks" && req.HTTPMethod == "POST":
			log.Printf("Matched POST /api/drinks route for userID: %s", authCtx.UserID)
			return AddDrinkHandler(ctx, authCtx, req)
		case req.Path == "/api/drinks" && req.HTTPMethod == "GET":
			log.Printf("Matched GET /api/drinks route for userID: %s", authCtx.UserID)
			return GetDrinksHandler(ctx, authCtx, req)
		case req.Path == "/api/drinks" && req.HTTPMethod == "DELETE":
			log.Printf("Matched DELETE /api/drinks route for userID: %s", authCtx.UserID)
			return DeleteDrinkHandler(ctx, authCtx, req)
		case req.Path == "/api/sync" && req.HTTPMethod == "POST":
			log.Printf("Matched POST /api/sync route for userID: %s", authCtx.UserID)
			return SyncDrinksHandler(ctx, authCtx, req)
		case req.Path == "/api/profile" && req.HTTPMethod == "GET":
			log.Printf("Matched GET /api/profile route for userID: %s", authCtx.UserID)
			return GetProfileHandler(ctx, authCtx, req)
		case req.Path == "/api/profile" && req.HTTPMethod == "PUT":
			log.Printf("Matched PUT /api/profile route for userID: %s", authCtx.UserID)
			return UpdateProfileHandler(ctx, authCtx, req)
		case req.Path == "/api/clear" && req.HTTPMethod == "DELETE":
			log.Printf("Matched DELETE /api/clear route for userID: %s", authCtx.UserID)
			return ClearUserDataHandler(ctx, authCtx, req)
		default:
			return events.APIGatewayProxyResponse{
				StatusCode: 404,
				Body:       `{"error": "not found", "path": "` + req.Path + `"}`,
				Headers:    map[string]string{"Content-Type": "application/json"},
			}, nil
		}
	})(ctx, req)
}
