package api

import (
	"context"
	"log"
	"net/http"
	"runtime/debug"

	"github.com/aws/aws-lambda-go/events"
)

type Route struct {
	Path         string
	Method       string
	Handler      ApiProxyGatewayHandler
	RequiresAuth bool
}

// Wrap authenticated handlers to match the standard signature
func wrapAuth(handler AuthenticatedApiProxyGatewayHandler) ApiProxyGatewayHandler {
	return WithAuth(handler)
}

var routes = []Route{
	// Public
	{"/api/health", http.MethodGet, HealthHandler, false},
	{"/api/beers", http.MethodGet, GetBeersHandler, false},

	// Protected
	{"/api/drinks", http.MethodPost, wrapAuth(AddDrinkHandler), true},
	{"/api/drinks", http.MethodGet, wrapAuth(GetDrinksHandler), true},
	{"/api/drinks", http.MethodDelete, wrapAuth(DeleteDrinkHandler), true},
	{"/api/sync", http.MethodPost, wrapAuth(SyncDrinksHandler), true},
	{"/api/profile", http.MethodGet, wrapAuth(GetProfileHandler), true},
	{"/api/profile", http.MethodPut, wrapAuth(UpdateProfileHandler), true},
	{"/api/clear", http.MethodDelete, wrapAuth(ClearUserDataHandler), true},
}

var Router ApiProxyGatewayHandler = func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic recovered: %v\nStack trace:\n%s", r, debug.Stack())
		}
	}()

	for _, route := range routes {
		if req.Path == route.Path && req.HTTPMethod == route.Method {
			log.Printf("Matched %s %s", req.HTTPMethod, req.Path)
			return route.Handler(ctx, req)
		}
	}

	return ErrorResponse(http.StatusNotFound, "Route not found")
}
