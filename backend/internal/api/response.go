package api

import (
	"encoding/json"
	"net/http"
	"slices"

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

// withCookies adds Set-Cookie headers to this response only. Cookies must never go
// in resp.Headers, which is the defaultHeaders map shared by every response: on a
// warm Lambda, that would send one user's session to the next request.
func withCookies(resp events.APIGatewayProxyResponse, cookies ...string) events.APIGatewayProxyResponse {
	multiValueHeaders := make(map[string][]string, len(resp.MultiValueHeaders)+1)
	for name, values := range resp.MultiValueHeaders {
		multiValueHeaders[name] = slices.Clone(values)
	}
	multiValueHeaders["Set-Cookie"] = append(multiValueHeaders["Set-Cookie"], cookies...)
	resp.MultiValueHeaders = multiValueHeaders
	return resp
}

func redirectResponse(location string, cookies ...string) (events.APIGatewayProxyResponse, error) {
	resp := events.APIGatewayProxyResponse{
		StatusCode: http.StatusFound,
		Headers:    map[string]string{"Location": location},
	}
	if len(cookies) == 0 {
		return resp, nil
	}
	return withCookies(resp, cookies...), nil
}
