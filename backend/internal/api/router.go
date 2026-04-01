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
	{"/api/beers/batch", http.MethodGet, GetBeersBatchHandler, false},

	// Protected
	{"/api/drinks", http.MethodPost, wrapAuth(AddDrinkHandler), true},
	{"/api/drinks", http.MethodGet, wrapAuth(GetDrinksHandler), true},
	{"/api/drinks", http.MethodDelete, wrapAuth(DeleteDrinkHandler), true},
	{"/api/sync", http.MethodPost, wrapAuth(SyncDrinksHandler), true},
	{"/api/profile", http.MethodGet, wrapAuth(GetProfileHandler), true},
	{"/api/profile", http.MethodPut, wrapAuth(UpdateProfileHandler), true},
	{"/api/clear", http.MethodDelete, wrapAuth(ClearUserDataHandler), true},
	{"/api/custom-beers", http.MethodPost, wrapAuth(AddCustomBeerHandler), true},
	{"/api/custom-beers", http.MethodGet, wrapAuth(GetCustomBeersHandler), true},
	{"/api/history", http.MethodPost, wrapAuth(SaveHistoryHandler), true},
	{"/api/history", http.MethodGet, wrapAuth(GetHistoryHandler), true},
}

var Router ApiProxyGatewayHandler = func(ctx context.Context, req events.APIGatewayProxyRequest) (resp events.APIGatewayProxyResponse, err error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic recovered: %v\nStack trace:\n%s", r, debug.Stack())
			resp, err = ErrorResponse(http.StatusInternalServerError, "internal server error")
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
