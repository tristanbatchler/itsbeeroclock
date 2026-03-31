package api

import (
	"encoding/json"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
)

var defaultHeaders = map[string]string{
	"Content-Type": "application/json",
}

func JSONResponse(statusCode int, body interface{}) (events.APIGatewayProxyResponse, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return ErrorResponse(http.StatusInternalServerError, "Failed to marshal response")
	}
	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Body:       string(jsonBody),
		Headers:    defaultHeaders,
	}, nil
}

func ErrorResponse(statusCode int, message string) (events.APIGatewayProxyResponse, error) {
	body, _ := json.Marshal(map[string]string{"error": message})
	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Body:       string(body),
		Headers:    defaultHeaders,
	}, nil
}

func SuccessResponse(body interface{}) (events.APIGatewayProxyResponse, error) {
	return JSONResponse(http.StatusOK, body)
}
