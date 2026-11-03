package api

import (
	"context"
	"net/http"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

// Property 8: Dev_Login isn't in the Lambda.
func TestRouterHasNoDevLogin(t *testing.T) {
	methods := []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch, http.MethodOptions, http.MethodHead}
	for _, method := range methods {
		resp, err := Router(context.Background(), events.APIGatewayProxyRequest{
			HTTPMethod:            method,
			Path:                  "/api/dev/login",
			QueryStringParameters: map[string]string{"user": "alice"},
		})
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("%s /api/dev/login = %d, want 404", method, resp.StatusCode)
		}
	}
}

func TestRouterHasNoMagicLink(t *testing.T) {
	resp, err := Router(context.Background(), events.APIGatewayProxyRequest{
		HTTPMethod: http.MethodPost,
		Path:       "/api/send-magic-link",
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("got %d, want 404", resp.StatusCode)
	}
}

func TestProtectedRoutesRequireASession(t *testing.T) {
	setSessionEnv(t)
	for _, route := range routes {
		if !route.RequiresAuth {
			continue
		}
		resp, err := Router(context.Background(), events.APIGatewayProxyRequest{
			HTTPMethod: route.Method,
			Path:       route.Path,
		})
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("%s %s = %d, want 401", route.Method, route.Path, resp.StatusCode)
		}
	}
}
