package api

import (
	"context"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
)

var HealthHandler ApiProxyGatewayHandler = func(ctx context.Context, apr events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return JSONResponse(http.StatusOK, AppResponse{Message: "Beer O'Clock is healthy!"})
}
