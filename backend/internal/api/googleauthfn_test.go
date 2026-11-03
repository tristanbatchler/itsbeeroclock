package api

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/golang-jwt/jwt/v5"
)

const testClientID = "test-client-id"

func setGoogleEnv(t *testing.T) {
	t.Helper()
	setSessionEnv(t)
	t.Setenv("GOOGLE_CLIENT_ID", testClientID)
	t.Setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
}

// fakeIDToken is signed with a junk key, because googleSubject doesn't check signatures.
func fakeIDToken(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	return signClaims(t, jwt.SigningMethodHS256, []byte("junk"), claims)
}

func validIDClaims(now time.Time) jwt.MapClaims {
	return jwt.MapClaims{
		"iss": "https://accounts.google.com",
		"aud": testClientID,
		"sub": "google-sub-123",
		"exp": now.Add(time.Hour).Unix(),
	}
}

// useTokenEndpoint points googleTokenURL at a fake server and counts its calls.
func useTokenEndpoint(t *testing.T, handler http.HandlerFunc) *atomic.Int32 {
	t.Helper()
	calls := &atomic.Int32{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		handler(w, r)
	}))
	t.Cleanup(server.Close)

	original := googleTokenURL
	googleTokenURL = server.URL
	t.Cleanup(func() { googleTokenURL = original })
	return calls
}

func callback(t *testing.T, query map[string]string, cookie string) events.APIGatewayProxyResponse {
	t.Helper()
	resp, err := GoogleCallbackHandler(context.Background(), events.APIGatewayProxyRequest{
		Headers:               map[string]string{"Cookie": cookie},
		QueryStringParameters: query,
	})
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func hasSessionCookie(resp events.APIGatewayProxyResponse) bool {
	return slices.ContainsFunc(resp.MultiValueHeaders["Set-Cookie"], func(c string) bool {
		return strings.HasPrefix(c, sessionCookieName+"=")
	})
}

func assertOAuthCookieExpired(t *testing.T, resp events.APIGatewayProxyResponse) {
	t.Helper()
	expired := slices.ContainsFunc(resp.MultiValueHeaders["Set-Cookie"], func(c string) bool {
		return strings.HasPrefix(c, oauthCookieName+"=;") && strings.Contains(c, "Max-Age=0")
	})
	if !expired {
		t.Errorf("boc_oauth wasn't expired: %v", resp.MultiValueHeaders["Set-Cookie"])
	}
}

func TestGoogleStartRedirect(t *testing.T) {
	setGoogleEnv(t)
	resp, err := GoogleStartHandler(context.Background(), events.APIGatewayProxyRequest{})
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusFound {
		t.Fatalf("status = %d", resp.StatusCode)
	}

	location, err := url.Parse(resp.Headers["Location"])
	if err != nil {
		t.Fatal(err)
	}
	if location.Host != "accounts.google.com" {
		t.Errorf("host = %s", location.Host)
	}
	q := location.Query()
	for name, want := range map[string]string{
		"client_id":             testClientID,
		"redirect_uri":          "https://example.test/api/auth/google/callback",
		"response_type":         "code",
		"scope":                 "openid",
		"code_challenge_method": "S256",
		"prompt":                "select_account",
	} {
		if got := q.Get(name); got != want {
			t.Errorf("%s = %q, want %q", name, got, want)
		}
	}

	cookies := (&http.Response{Header: http.Header{"Set-Cookie": resp.MultiValueHeaders["Set-Cookie"]}}).Cookies()
	if len(cookies) != 1 || cookies[0].Name != oauthCookieName {
		t.Fatalf("cookies = %v", cookies)
	}
	if cookies[0].Path != oauthCookiePath || cookies[0].MaxAge != 600 || !cookies[0].HttpOnly || !cookies[0].Secure || cookies[0].SameSite != http.SameSiteLaxMode {
		t.Errorf("wrong attributes: %+v", cookies[0])
	}

	state, verifier, found := strings.Cut(cookies[0].Value, ".")
	if !found || q.Get("state") != state {
		t.Errorf("state in the URL doesn't match the cookie")
	}
	challenge := sha256.Sum256([]byte(verifier))
	if q.Get("code_challenge") != base64.RawURLEncoding.EncodeToString(challenge[:]) {
		t.Error("code_challenge doesn't match the verifier")
	}
}

func TestGoogleStartIsDifferentEachTime(t *testing.T) {
	setGoogleEnv(t)
	first, _ := GoogleStartHandler(context.Background(), events.APIGatewayProxyRequest{})
	second, _ := GoogleStartHandler(context.Background(), events.APIGatewayProxyRequest{})
	if first.MultiValueHeaders["Set-Cookie"][0] == second.MultiValueHeaders["Set-Cookie"][0] {
		t.Error("state and verifier were reused")
	}
}

func TestGoogleStartWithoutConfigFails(t *testing.T) {
	setGoogleEnv(t)
	t.Setenv("GOOGLE_CLIENT_ID", "")
	resp, err := GoogleStartHandler(context.Background(), events.APIGatewayProxyRequest{})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Headers["Location"] != signInFailedPath {
		t.Errorf("location = %q", resp.Headers["Location"])
	}
}

// Property 6: without a matching state, nothing reaches Google and no session is set.
func TestCallbackRequiresMatchingState(t *testing.T) {
	setGoogleEnv(t)
	calls := useTokenEndpoint(t, func(w http.ResponseWriter, r *http.Request) {
		t.Error("the token endpoint was called")
	})

	tests := map[string]struct {
		query  map[string]string
		cookie string
	}{
		"no state":         {map[string]string{"code": "c"}, oauthCookieName + "=good.verifier"},
		"different state":  {map[string]string{"code": "c", "state": "evil"}, oauthCookieName + "=good.verifier"},
		"no cookie":        {map[string]string{"code": "c", "state": "good"}, ""},
		"empty state both": {map[string]string{"code": "c", "state": ""}, oauthCookieName + "=.verifier"},
		"no verifier":      {map[string]string{"code": "c", "state": "good"}, oauthCookieName + "=good."},
		"cookie no dot":    {map[string]string{"code": "c", "state": "good"}, oauthCookieName + "=good"},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			resp := callback(t, tt.query, tt.cookie)
			if resp.Headers["Location"] != signInFailedPath {
				t.Errorf("location = %q", resp.Headers["Location"])
			}
			if hasSessionCookie(resp) {
				t.Error("a session was set")
			}
			assertOAuthCookieExpired(t, resp)
		})
	}
	if calls.Load() != 0 {
		t.Errorf("token endpoint called %d times", calls.Load())
	}
}

func TestCallbackCancelShowsNoError(t *testing.T) {
	setGoogleEnv(t)
	calls := useTokenEndpoint(t, func(w http.ResponseWriter, r *http.Request) {})

	resp := callback(t, map[string]string{"error": "access_denied", "state": "good"}, oauthCookieName+"=good.verifier")
	if resp.Headers["Location"] != signInPath {
		t.Errorf("location = %q", resp.Headers["Location"])
	}
	if hasSessionCookie(resp) {
		t.Error("a session was set")
	}
	assertOAuthCookieExpired(t, resp)
	if calls.Load() != 0 {
		t.Error("token endpoint was called")
	}
}

func TestCallbackOtherGoogleErrorFails(t *testing.T) {
	setGoogleEnv(t)
	resp := callback(t, map[string]string{"error": "server_error", "state": "good"}, oauthCookieName+"=good.verifier")
	if resp.Headers["Location"] != signInFailedPath || hasSessionCookie(resp) {
		t.Errorf("location = %q, session = %v", resp.Headers["Location"], hasSessionCookie(resp))
	}
}

func TestCallbackSuccess(t *testing.T) {
	setGoogleEnv(t)
	token := fakeIDToken(t, validIDClaims(time.Now()))
	useTokenEndpoint(t, func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Error(err)
		}
		for name, want := range map[string]string{
			"grant_type":    "authorization_code",
			"code":          "the/code",
			"code_verifier": "verifier",
			"client_id":     testClientID,
			"client_secret": "test-client-secret",
			"redirect_uri":  "https://example.test/api/auth/google/callback",
		} {
			if got := r.PostForm.Get(name); got != want {
				t.Errorf("%s = %q, want %q", name, got, want)
			}
		}
		w.Write([]byte(`{"id_token":"` + token + `"}`))
	})

	resp := callback(t, map[string]string{"code": "the/code", "state": "good"}, oauthCookieName+"=good.verifier")
	if resp.StatusCode != http.StatusFound || resp.Headers["Location"] != signedInPath {
		t.Fatalf("got %d to %q", resp.StatusCode, resp.Headers["Location"])
	}
	assertOAuthCookieExpired(t, resp)

	cookies := (&http.Response{Header: http.Header{"Set-Cookie": resp.MultiValueHeaders["Set-Cookie"]}}).Cookies()
	var session string
	for _, cookie := range cookies {
		if cookie.Name == sessionCookieName {
			session = cookie.Value
		}
	}
	claims, err := verifySessionToken(session, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != "google-sub-123" {
		t.Errorf("subject = %q", claims.Subject)
	}
}

func TestCallbackFailedExchange(t *testing.T) {
	expiredToken := func(t *testing.T) string {
		claims := validIDClaims(time.Now())
		claims["exp"] = time.Now().Add(-time.Hour).Unix()
		return fakeIDToken(t, claims)
	}
	tests := map[string]func(t *testing.T) http.HandlerFunc{
		"rejected code": func(t *testing.T) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, `{"error":"invalid_grant"}`, http.StatusBadRequest)
			}
		},
		"not JSON": func(t *testing.T) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("<html>")) }
		},
		"no id_token": func(t *testing.T) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"access_token":"x"}`)) }
		},
		"invalid id_token": func(t *testing.T) http.HandlerFunc {
			token := expiredToken(t)
			return func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id_token":"` + token + `"}`)) }
		},
	}
	for name, handler := range tests {
		t.Run(name, func(t *testing.T) {
			setGoogleEnv(t)
			useTokenEndpoint(t, handler(t))
			resp := callback(t, map[string]string{"code": "c", "state": "good"}, oauthCookieName+"=good.verifier")
			if resp.Headers["Location"] != signInFailedPath {
				t.Errorf("location = %q", resp.Headers["Location"])
			}
			if hasSessionCookie(resp) {
				t.Error("a session was set")
			}
			assertOAuthCookieExpired(t, resp)
		})
	}
}

func TestCallbackGoogleUnreachable(t *testing.T) {
	setGoogleEnv(t)
	server := httptest.NewServer(http.NotFoundHandler())
	unreachable := server.URL
	server.Close()

	original := googleTokenURL
	googleTokenURL = unreachable
	t.Cleanup(func() { googleTokenURL = original })

	resp := callback(t, map[string]string{"code": "c", "state": "good"}, oauthCookieName+"=good.verifier")
	if resp.Headers["Location"] != signInFailedPath || hasSessionCookie(resp) {
		t.Errorf("location = %q, session = %v", resp.Headers["Location"], hasSessionCookie(resp))
	}
	assertOAuthCookieExpired(t, resp)
}

func TestCallbackWithBadSessionSecretFails(t *testing.T) {
	setGoogleEnv(t)
	token := fakeIDToken(t, validIDClaims(time.Now()))
	useTokenEndpoint(t, func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"id_token":"` + token + `"}`))
	})
	t.Setenv("SESSION_SECRET", "short")

	resp := callback(t, map[string]string{"code": "c", "state": "good"}, oauthCookieName+"=good.verifier")
	if resp.Headers["Location"] != signInFailedPath || hasSessionCookie(resp) {
		t.Errorf("location = %q, session = %v", resp.Headers["Location"], hasSessionCookie(resp))
	}
}

// Property 7: the sub is only returned when every claim checks out.
func TestGoogleSubject(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	with := func(change func(jwt.MapClaims)) jwt.MapClaims {
		claims := validIDClaims(now)
		change(claims)
		return claims
	}

	valid := map[string]jwt.MapClaims{
		"https issuer": validIDClaims(now),
		"bare issuer":  with(func(c jwt.MapClaims) { c["iss"] = "accounts.google.com" }),
	}
	for name, claims := range valid {
		t.Run(name, func(t *testing.T) {
			subject, err := googleSubject(fakeIDToken(t, claims), testClientID, now)
			if err != nil || subject != "google-sub-123" {
				t.Errorf("got %q, %v", subject, err)
			}
		})
	}

	invalid := map[string]jwt.MapClaims{
		"wrong issuer":      with(func(c jwt.MapClaims) { c["iss"] = "https://evil.example" }),
		"no issuer":         with(func(c jwt.MapClaims) { delete(c, "iss") }),
		"wrong audience":    with(func(c jwt.MapClaims) { c["aud"] = "another-client" }),
		"no audience":       with(func(c jwt.MapClaims) { delete(c, "aud") }),
		"extra audience":    with(func(c jwt.MapClaims) { c["aud"] = []string{testClientID, "another-client"} }),
		"expired":           with(func(c jwt.MapClaims) { c["exp"] = now.Add(-time.Second).Unix() }),
		"expires right now": with(func(c jwt.MapClaims) { c["exp"] = now.Unix() }),
		"no exp":            with(func(c jwt.MapClaims) { delete(c, "exp") }),
		"empty sub":         with(func(c jwt.MapClaims) { c["sub"] = "" }),
		"no sub":            with(func(c jwt.MapClaims) { delete(c, "sub") }),
	}
	for name, claims := range invalid {
		t.Run(name, func(t *testing.T) {
			if subject, err := googleSubject(fakeIDToken(t, claims), testClientID, now); err == nil {
				t.Errorf("accepted, returning %q", subject)
			}
		})
	}

	if _, err := googleSubject("not-a-token", testClientID, now); err == nil {
		t.Error("accepted a malformed token")
	}
	if _, err := googleSubject(fakeIDToken(t, validIDClaims(now)), "", now); err == nil {
		t.Error("accepted with no configured client ID")
	}
}
