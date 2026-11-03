package api

import (
	"context"
	"net/http"
	"time"

	"github.com/aws/aws-lambda-go/events"
)

type sessionUser struct {
	ID string `json:"id"`
}

type sessionResponse struct {
	User *sessionUser `json:"user"`
}

// GetSessionHandler always returns 200, so being signed out doesn't fill the console with 401s.
var GetSessionHandler ApiProxyGatewayHandler = func(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	token := requestCookie(req.Headers, sessionCookieName)
	if token == "" {
		return SuccessResponse(sessionResponse{})
	}

	claims, err := verifySessionToken(token, time.Now())
	if err != nil {
		return SuccessResponse(sessionResponse{})
	}
	return SuccessResponse(sessionResponse{User: &sessionUser{ID: claims.Subject}})
}

// SignOutHandler is public so that an expired session can still clear its cookie.
var SignOutHandler ApiProxyGatewayHandler = func(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	resp, err := JSONResponse(http.StatusOK, map[string]bool{"signedOut": true})
	if err != nil {
		return resp, err
	}
	return withCookies(resp, expiredSessionCookie()), nil
}
