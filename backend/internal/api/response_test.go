package api

import (
	"maps"
	"testing"
)

// Property 3: cookies never reach the shared defaultHeaders map.
func TestWithCookiesLeavesDefaultHeadersAlone(t *testing.T) {
	before := maps.Clone(defaultHeaders)

	first, err := SuccessResponse("first")
	if err != nil {
		t.Fatal(err)
	}
	first = withCookies(first, "a=1", "b=2")

	second, err := SuccessResponse("second")
	if err != nil {
		t.Fatal(err)
	}

	if got := first.MultiValueHeaders["Set-Cookie"]; len(got) != 2 {
		t.Errorf("first response cookies = %v", got)
	}
	if len(second.MultiValueHeaders) != 0 {
		t.Errorf("second response has %v", second.MultiValueHeaders)
	}
	if !maps.Equal(defaultHeaders, before) {
		t.Errorf("defaultHeaders changed: %v", defaultHeaders)
	}
}

func TestWithCookiesDoesNotMutateTheOriginal(t *testing.T) {
	resp, err := SuccessResponse("ok")
	if err != nil {
		t.Fatal(err)
	}
	one := withCookies(resp, "a=1")
	two := withCookies(one, "b=2")

	if got := one.MultiValueHeaders["Set-Cookie"]; len(got) != 1 {
		t.Errorf("first response cookies = %v", got)
	}
	if got := two.MultiValueHeaders["Set-Cookie"]; len(got) != 2 {
		t.Errorf("second response cookies = %v", got)
	}
}

func TestRedirectResponse(t *testing.T) {
	resp, err := redirectResponse("/profile", "a=1", "b=2")
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 302 || resp.Headers["Location"] != "/profile" {
		t.Errorf("got %d to %q", resp.StatusCode, resp.Headers["Location"])
	}
	if got := resp.MultiValueHeaders["Set-Cookie"]; len(got) != 2 {
		t.Errorf("cookies = %v", got)
	}
	if _, found := resp.Headers["Set-Cookie"]; found {
		t.Error("cookie written to Headers")
	}
}
