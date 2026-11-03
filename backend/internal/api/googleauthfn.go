package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/golang-jwt/jwt/v5"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

const (
	googleAuthURL     = "https://accounts.google.com/o/oauth2/v2/auth"
	oauthCookieName   = "boc_oauth"
	oauthCookiePath   = "/api/auth/google"
	oauthCookieMaxAge = 600
	googleCallback    = "/api/auth/google/callback"

	signInPath       = "/sign-in"
	signInFailedPath = "/sign-in?error=failed"
	signedInPath     = "/profile"
)

var googleTokenURL = "https://oauth2.googleapis.com/token" // overridden in tests

func oauthCookie(value string) string {
	return buildCookie(oauthCookieName, value, oauthCookiePath, oauthCookieMaxAge)
}

func expiredOAuthCookie() string {
	return buildCookie(oauthCookieName, "", oauthCookiePath, -1)
}

// googleRedirectURI comes from APP_ORIGIN, not the request, because CloudFront
// replaces Host on /api/* (ALL_VIEWER_EXCEPT_HOST_HEADER).
func googleRedirectURI() string {
	origin := strings.TrimRight(utils.GetVar("APP_ORIGIN"), "/")
	if origin == "" {
		return ""
	}
	return origin + googleCallback
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// GoogleStartHandler sends the browser to Google, remembering state and the PKCE verifier in boc_oauth.
var GoogleStartHandler ApiProxyGatewayHandler = func(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	clientID := utils.GetVar("GOOGLE_CLIENT_ID")
	redirectURI := googleRedirectURI()
	if clientID == "" {
		log.Printf("GoogleStartHandler: GOOGLE_CLIENT_ID is not set")
		return redirectResponse(signInFailedPath)
	}
	if redirectURI == "" {
		log.Printf("GoogleStartHandler: APP_ORIGIN is not set")
		return redirectResponse(signInFailedPath)
	}

	state, err := randomToken()
	if err != nil {
		log.Printf("GoogleStartHandler: failed to generate state: %v", err)
		return redirectResponse(signInFailedPath)
	}
	verifier, err := randomToken()
	if err != nil {
		log.Printf("GoogleStartHandler: failed to generate verifier: %v", err)
		return redirectResponse(signInFailedPath)
	}
	challenge := sha256.Sum256([]byte(verifier))

	query := url.Values{
		"client_id":             {clientID},
		"redirect_uri":          {redirectURI},
		"response_type":         {"code"},
		"scope":                 {"openid"},
		"state":                 {state},
		"code_challenge":        {base64.RawURLEncoding.EncodeToString(challenge[:])},
		"code_challenge_method": {"S256"},
		// Stops a shared device from silently reusing the last Google account.
		"prompt": {"select_account"},
	}
	return redirectResponse(googleAuthURL+"?"+query.Encode(), oauthCookie(state+"."+verifier))
}

// GoogleCallbackHandler finishes sign-in. Every path expires boc_oauth, so it's single-use.
var GoogleCallbackHandler ApiProxyGatewayHandler = func(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	query := req.QueryStringParameters
	failed := func(reason string, err error) (events.APIGatewayProxyResponse, error) {
		// Only ever log the reason: never codes, tokens or cookie values.
		log.Printf("GoogleCallbackHandler: %s: %v", reason, err)
		return redirectResponse(signInFailedPath, expiredOAuthCookie())
	}

	if query["error"] == "access_denied" {
		return redirectResponse(signInPath, expiredOAuthCookie())
	}

	state, verifier, found := strings.Cut(requestCookie(req.Headers, oauthCookieName), ".")
	if !found || state == "" || verifier == "" {
		return failed("state check failed", errors.New("no boc_oauth cookie"))
	}
	if subtle.ConstantTimeCompare([]byte(query["state"]), []byte(state)) != 1 {
		return failed("state check failed", errors.New("state doesn't match the cookie"))
	}

	if query["error"] != "" || query["code"] == "" {
		return failed("no authorization code", errors.New("Google returned an error or no code"))
	}

	idToken, err := exchangeGoogleCode(ctx, query["code"], verifier)
	if err != nil {
		return failed("code exchange failed", err)
	}

	now := time.Now()
	subject, err := googleSubject(idToken, utils.GetVar("GOOGLE_CLIENT_ID"), now)
	if err != nil {
		return failed("invalid ID token", err)
	}

	token, err := createSessionToken(subject, now)
	if err != nil {
		return failed("failed to create session", err)
	}
	return redirectResponse(signedInPath, sessionCookie(token), expiredOAuthCookie())
}

func exchangeGoogleCode(ctx context.Context, code, verifier string) (string, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"code_verifier": {verifier},
		"client_id":     {utils.GetVar("GOOGLE_CLIENT_ID")},
		"client_secret": {utils.GetVar("GOOGLE_CLIENT_SECRET")},
		"redirect_uri":  {googleRedirectURI()},
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, googleTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token endpoint returned %d", resp.StatusCode)
	}

	var body struct {
		IDToken string `json:"id_token"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&body); err != nil {
		return "", errors.New("token response isn't valid JSON")
	}
	if body.IDToken == "" {
		return "", errors.New("token response has no id_token")
	}
	return body.IDToken, nil
}

// googleSubject reads the sub claim. The signature isn't checked because the token
// came straight from Google's token endpoint over TLS, using our client secret.
func googleSubject(idToken, clientID string, now time.Time) (string, error) {
	claims := jwt.MapClaims{}
	if _, _, err := jwt.NewParser().ParseUnverified(idToken, claims); err != nil {
		return "", errors.New("ID token is malformed")
	}

	issuer, err := claims.GetIssuer()
	if err != nil || (issuer != "https://accounts.google.com" && issuer != "accounts.google.com") {
		return "", errors.New("wrong issuer")
	}

	audience, err := claims.GetAudience()
	if err != nil || clientID == "" || !slices.Equal(audience, jwt.ClaimStrings{clientID}) {
		return "", errors.New("wrong audience")
	}

	expiry, err := claims.GetExpirationTime()
	if err != nil || expiry == nil || !now.Before(expiry.Time) {
		return "", errors.New("expired or missing exp")
	}

	subject, err := claims.GetSubject()
	if err != nil || subject == "" {
		return "", errors.New("missing sub")
	}
	return subject, nil
}
