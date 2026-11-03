package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/golang-jwt/jwt/v5"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

const (
	sessionCookieName = "boc_session"
	sessionCookiePath = "/api"
	sessionLifetime   = 90 * 24 * time.Hour
	sessionRenewAfter = 24 * time.Hour
	sessionIssuer     = "beeroclock"
	sessionAudience   = "beeroclock-session"
	minSessionSecret  = 32
)

type sessionClaims struct {
	jwt.RegisteredClaims
}

// sessionSecret fails closed: without a strong secret nothing can be signed or verified.
func sessionSecret() ([]byte, error) {
	secret := utils.GetVar("SESSION_SECRET")
	if len(secret) < minSessionSecret {
		log.Printf("sessionSecret: SESSION_SECRET is missing or under %d bytes", minSessionSecret)
		return nil, errors.New("session secret not configured")
	}
	return []byte(secret), nil
}

func createSessionToken(userID string, now time.Time) (string, error) {
	secret, err := sessionSecret()
	if err != nil {
		return "", err
	}
	if userID == "" {
		return "", errors.New("no user ID")
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": sessionIssuer,
		"aud": sessionAudience,
		"sub": userID,
		"iat": now.Unix(),
		"exp": now.Add(sessionLifetime).Unix(),
	}).SignedString(secret)
}

func verifySessionToken(token string, now time.Time) (*sessionClaims, error) {
	secret, err := sessionSecret()
	if err != nil {
		return nil, err
	}

	claims := &sessionClaims{}
	_, err = jwt.ParseWithClaims(
		token,
		claims,
		func(*jwt.Token) (any, error) { return secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(sessionIssuer),
		jwt.WithAudience(sessionAudience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(func() time.Time { return now }),
	)
	if err != nil {
		return nil, err
	}
	if claims.Subject == "" || claims.IssuedAt == nil {
		return nil, errors.New("session is missing sub or iat")
	}
	return claims, nil
}

// buildCookie is Secure only when the app itself is served over HTTPS, so that
// sign-in also works on http://localhost.
func buildCookie(name, value, path string, maxAge int) string {
	cookie := http.Cookie{
		Name:     name,
		Value:    value,
		Path:     path,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   strings.HasPrefix(utils.GetVar("APP_ORIGIN"), "https://"),
		SameSite: http.SameSiteLaxMode,
	}
	return cookie.String()
}

func sessionCookie(token string) string {
	return buildCookie(sessionCookieName, token, sessionCookiePath, int(sessionLifetime.Seconds()))
}

func expiredSessionCookie() string {
	return buildCookie(sessionCookieName, "", sessionCookiePath, -1)
}

// requestCookie returns the named cookie's value, or "" if it isn't there.
func requestCookie(headers map[string]string, name string) string {
	// Safely check for both uppercase and lowercase
	raw := headers["Cookie"]
	if raw == "" {
		raw = headers["cookie"]
	}
	if raw == "" {
		return ""
	}

	req := http.Request{Header: http.Header{"Cookie": {raw}}}
	cookie, err := req.Cookie(name)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// IssueSessionCookie is exported for Dev_Login in cmd/local. It returns a Set-Cookie value.
func IssueSessionCookie(userID string) (string, error) {
	token, err := createSessionToken(userID, time.Now())
	if err != nil {
		return "", fmt.Errorf("creating session: %w", err)
	}
	return sessionCookie(token), nil
}

func WithAuth(handler AuthenticatedApiProxyGatewayHandler) ApiProxyGatewayHandler {
	return func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		now := time.Now()

		token := requestCookie(req.Headers, sessionCookieName)
		if token == "" {
			return ErrorResponse(http.StatusUnauthorized, "not signed in")
		}

		claims, err := verifySessionToken(token, now)
		if err != nil {
			return ErrorResponse(http.StatusUnauthorized, "not signed in")
		}

		resp, err := handler(ctx, &AuthContext{UserID: claims.Subject}, req)
		if err != nil {
			return resp, err
		}

		if now.Sub(claims.IssuedAt.Time) > sessionRenewAfter {
			renewed, err := createSessionToken(claims.Subject, now)
			if err != nil {
				log.Printf("WithAuth: failed to renew session: %v", err)
				return resp, nil
			}
			return withCookies(resp, sessionCookie(renewed)), nil
		}
		return resp, nil
	}
}
