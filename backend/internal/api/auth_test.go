package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"maps"
	"net/http"
	"slices"
	"strings"
	"testing"
	"testing/quick"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/golang-jwt/jwt/v5"
)

const testSessionSecret = "test-session-secret-that-is-long-enough"

func setSessionEnv(t *testing.T) {
	t.Helper()
	t.Setenv("SESSION_SECRET", testSessionSecret)
	t.Setenv("APP_ORIGIN", "https://example.test")
}

func signClaims(t *testing.T, method jwt.SigningMethod, key any, claims jwt.MapClaims) string {
	t.Helper()
	token, err := jwt.NewWithClaims(method, claims).SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func validClaims(now time.Time) jwt.MapClaims {
	return jwt.MapClaims{
		"iss": sessionIssuer,
		"aud": sessionAudience,
		"sub": "user",
		"iat": now.Unix(),
		"exp": now.Add(time.Hour).Unix(),
	}
}

// Property 1: a session round trips until exp, and fails from exp onward.
func TestSessionRoundTrip(t *testing.T) {
	setSessionEnv(t)
	now := time.Unix(1_800_000_000, 0)

	roundTrip := func(userID string) bool {
		if userID == "" {
			return true
		}
		token, err := createSessionToken(userID, now)
		if err != nil {
			return false
		}
		claims, err := verifySessionToken(token, now.Add(sessionLifetime-time.Second))
		if err != nil || claims.Subject != userID {
			return false
		}
		if _, err := verifySessionToken(token, now.Add(sessionLifetime)); err == nil {
			return false
		}
		_, err = verifySessionToken(token, now.Add(sessionLifetime+time.Hour))
		return err != nil
	}
	if err := quick.Check(roundTrip, nil); err != nil {
		t.Error(err)
	}
}

// Property 2: changing any byte invalidates the token.
func TestSessionRejectsAlteredBytes(t *testing.T) {
	setSessionEnv(t)
	now := time.Unix(1_800_000_000, 0)
	token, err := createSessionToken("user", now)
	if err != nil {
		t.Fatal(err)
	}

	for i := range token {
		altered := []byte(token)
		if altered[i] == 'A' {
			altered[i] = 'B'
		} else {
			altered[i] = 'A'
		}
		claims, err := verifySessionToken(string(altered), now)
		// The last base64 character of a segment can have unused bits, so a change
		// there may decode to the same bytes. Anything that passes must be unchanged.
		if err == nil && (claims.Subject != "user" || !isTrailingSegmentByte(token, i)) {
			t.Errorf("accepted a token altered at byte %d", i)
		}
	}
}

func isTrailingSegmentByte(token string, i int) bool {
	return i == len(token)-1 || token[i+1] == '.'
}

// Property 2: wrong secret, alg, issuer, audience and missing claims are rejected.
func TestSessionRejectsBadTokens(t *testing.T) {
	setSessionEnv(t)
	now := time.Unix(1_800_000_000, 0)
	secret := []byte(testSessionSecret)

	with := func(change func(jwt.MapClaims)) jwt.MapClaims {
		claims := validClaims(now)
		change(claims)
		return claims
	}

	tests := map[string]string{
		"wrong secret":   signClaims(t, jwt.SigningMethodHS256, []byte("another-secret-that-is-also-long-enough"), validClaims(now)),
		"HS384":          signClaims(t, jwt.SigningMethodHS384, secret, validClaims(now)),
		"HS512":          signClaims(t, jwt.SigningMethodHS512, secret, validClaims(now)),
		"alg none":       signClaims(t, jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, validClaims(now)),
		"wrong issuer":   signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { c["iss"] = "someone-else" })),
		"no issuer":      signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { delete(c, "iss") })),
		"wrong audience": signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { c["aud"] = "authenticated" })),
		"no audience":    signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { delete(c, "aud") })),
		"no exp":         signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { delete(c, "exp") })),
		"expired":        signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { c["exp"] = now.Add(-time.Second).Unix() })),
		"no sub":         signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { delete(c, "sub") })),
		"no iat":         signClaims(t, jwt.SigningMethodHS256, secret, with(func(c jwt.MapClaims) { delete(c, "iat") })),
		"not a token":    "nonsense",
		"empty":          "",
	}

	if _, err := verifySessionToken(signClaims(t, jwt.SigningMethodHS256, secret, validClaims(now)), now); err != nil {
		t.Fatalf("the control token should pass: %v", err)
	}
	for name, token := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := verifySessionToken(token, now); err == nil {
				t.Error("accepted a bad token")
			}
		})
	}
}

func TestSessionFailsClosedWithoutStrongSecret(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)

	t.Setenv("SESSION_SECRET", testSessionSecret)
	token, err := createSessionToken("user", now)
	if err != nil {
		t.Fatal(err)
	}

	for name, secret := range map[string]string{"missing": "", "short": strings.Repeat("x", minSessionSecret-1)} {
		t.Run(name, func(t *testing.T) {
			t.Setenv("SESSION_SECRET", secret)
			if _, err := createSessionToken("user", now); err == nil {
				t.Error("signed a session")
			}
			if _, err := verifySessionToken(token, now); err == nil {
				t.Error("verified a session")
			}
		})
	}
}

// Property 4: a session holds no identity data beyond the subject.
func TestSessionPayloadKeys(t *testing.T) {
	setSessionEnv(t)
	token, err := createSessionToken("user", time.Unix(1_800_000_000, 0))
	if err != nil {
		t.Fatal(err)
	}

	payload, err := base64.RawURLEncoding.DecodeString(strings.Split(token, ".")[1])
	if err != nil {
		t.Fatal(err)
	}
	var claims map[string]any
	if err := json.Unmarshal(payload, &claims); err != nil {
		t.Fatal(err)
	}

	keys := slices.Sorted(maps.Keys(claims))
	want := []string{"aud", "exp", "iat", "iss", "sub"}
	if !slices.Equal(keys, want) {
		t.Errorf("payload keys = %v, want %v", keys, want)
	}
}

func TestCookieAttributes(t *testing.T) {
	setSessionEnv(t)
	cookie := sessionCookie("value")
	for _, want := range []string{"boc_session=value", "Path=/api", "Max-Age=7776000", "HttpOnly", "Secure", "SameSite=Lax"} {
		if !strings.Contains(cookie, want) {
			t.Errorf("%q is missing %q", cookie, want)
		}
	}

	t.Setenv("APP_ORIGIN", "http://localhost:5173")
	if cookie := sessionCookie("value"); strings.Contains(cookie, "Secure") {
		t.Errorf("%q shouldn't be Secure on http", cookie)
	}
	if cookie := expiredSessionCookie(); !strings.Contains(cookie, "Max-Age=0") {
		t.Errorf("%q should expire immediately", cookie)
	}
}

func TestRequestCookie(t *testing.T) {
	tests := []struct {
		name    string
		headers map[string]string
		want    string
	}{
		{"uppercase header", map[string]string{"Cookie": "boc_session=abc"}, "abc"},
		{"lowercase header", map[string]string{"cookie": "boc_session=abc"}, "abc"},
		{"among others", map[string]string{"Cookie": "a=1; boc_session=abc; b=2"}, "abc"},
		{"another cookie only", map[string]string{"Cookie": "a=1"}, ""},
		{"no header", map[string]string{}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := requestCookie(tt.headers, sessionCookieName); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func authedHandlerRecording(called *string) ApiProxyGatewayHandler {
	return WithAuth(func(ctx context.Context, auth *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		*called = auth.UserID
		return SuccessResponse(map[string]bool{"ok": true})
	})
}

// Property 5: bearer tokens are ignored, even one holding a valid session.
func TestWithAuthIgnoresBearerTokens(t *testing.T) {
	setSessionEnv(t)
	token, err := createSessionToken("user", time.Now())
	if err != nil {
		t.Fatal(err)
	}

	for _, header := range []string{"Authorization", "authorization"} {
		called := ""
		resp, err := authedHandlerRecording(&called)(context.Background(), events.APIGatewayProxyRequest{
			Headers: map[string]string{header: "Bearer " + token},
		})
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("%s: status = %d, want 401", header, resp.StatusCode)
		}
		if called != "" {
			t.Errorf("%s: the handler was called", header)
		}
	}
}

func TestWithAuthAcceptsCookieAndRejectsBadOne(t *testing.T) {
	setSessionEnv(t)
	token, err := createSessionToken("user", time.Now())
	if err != nil {
		t.Fatal(err)
	}

	called := ""
	resp, err := authedHandlerRecording(&called)(context.Background(), events.APIGatewayProxyRequest{
		Headers: map[string]string{"Cookie": sessionCookieName + "=" + token},
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusOK || called != "user" {
		t.Errorf("status = %d, user = %q", resp.StatusCode, called)
	}
	if len(resp.MultiValueHeaders["Set-Cookie"]) != 0 {
		t.Error("a new session shouldn't be renewed")
	}

	called = ""
	resp, err = authedHandlerRecording(&called)(context.Background(), events.APIGatewayProxyRequest{
		Headers: map[string]string{"Cookie": sessionCookieName + "=" + token + "x"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusUnauthorized || called != "" {
		t.Errorf("status = %d, user = %q", resp.StatusCode, called)
	}
}

// Property 3: across users' renewals, each response only carries its own session,
// and the shared defaultHeaders map never changes.
func TestRenewalNeverLeaksBetweenResponses(t *testing.T) {
	setSessionEnv(t)
	headersBefore := maps.Clone(defaultHeaders)
	old := time.Now().Add(-sessionRenewAfter - time.Minute)

	responses := make(map[string]events.APIGatewayProxyResponse)
	for _, user := range []string{"alice", "bob", "alice", "bob"} {
		token, err := createSessionToken(user, old)
		if err != nil {
			t.Fatal(err)
		}
		called := ""
		resp, err := authedHandlerRecording(&called)(context.Background(), events.APIGatewayProxyRequest{
			Headers: map[string]string{"Cookie": sessionCookieName + "=" + token},
		})
		if err != nil {
			t.Fatal(err)
		}
		if called != user {
			t.Fatalf("handler ran as %q, want %q", called, user)
		}
		responses[user] = resp
	}

	for user, resp := range responses {
		cookies := resp.MultiValueHeaders["Set-Cookie"]
		if len(cookies) != 1 {
			t.Fatalf("%s: got %d cookies, want 1", user, len(cookies))
		}
		parsed := http.Response{Header: http.Header{"Set-Cookie": cookies}}
		claims, err := verifySessionToken(parsed.Cookies()[0].Value, time.Now())
		if err != nil {
			t.Fatalf("%s: %v", user, err)
		}
		if claims.Subject != user {
			t.Errorf("%s received a session for %s", user, claims.Subject)
		}
		if time.Since(claims.IssuedAt.Time) > time.Minute {
			t.Errorf("%s: session wasn't renewed", user)
		}
		if _, found := resp.Headers["Set-Cookie"]; found {
			t.Errorf("%s: cookie was written to the shared headers", user)
		}
	}
	if !maps.Equal(defaultHeaders, headersBefore) {
		t.Errorf("defaultHeaders changed: %v", defaultHeaders)
	}
}

func TestWithAuthRenewsOnlyAfterADay(t *testing.T) {
	setSessionEnv(t)
	token, err := createSessionToken("user", time.Now().Add(-sessionRenewAfter+time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	called := ""
	resp, err := authedHandlerRecording(&called)(context.Background(), events.APIGatewayProxyRequest{
		Headers: map[string]string{"Cookie": sessionCookieName + "=" + token},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.MultiValueHeaders["Set-Cookie"]) != 0 {
		t.Error("renewed a session younger than a day")
	}
}

func TestGetSessionHandler(t *testing.T) {
	setSessionEnv(t)
	token, err := createSessionToken("user", time.Now())
	if err != nil {
		t.Fatal(err)
	}

	tests := map[string]struct {
		cookie string
		want   string
	}{
		"signed in":   {sessionCookieName + "=" + token, `{"user":{"id":"user"}}`},
		"signed out":  {"", `{"user":null}`},
		"bad session": {sessionCookieName + "=nonsense", `{"user":null}`},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			resp, err := GetSessionHandler(context.Background(), events.APIGatewayProxyRequest{
				Headers: map[string]string{"Cookie": tt.cookie},
			})
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != http.StatusOK || resp.Body != tt.want {
				t.Errorf("got %d %s, want 200 %s", resp.StatusCode, resp.Body, tt.want)
			}
		})
	}
}

func TestSignOutExpiresCookieWithoutASession(t *testing.T) {
	setSessionEnv(t)
	resp, err := SignOutHandler(context.Background(), events.APIGatewayProxyRequest{})
	if err != nil {
		t.Fatal(err)
	}
	cookies := resp.MultiValueHeaders["Set-Cookie"]
	if resp.StatusCode != http.StatusOK || len(cookies) != 1 || !strings.Contains(cookies[0], "boc_session=;") || !strings.Contains(cookies[0], "Max-Age=0") {
		t.Errorf("got %d, cookies %v", resp.StatusCode, cookies)
	}
}
