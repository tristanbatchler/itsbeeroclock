package main

import (
	"strings"
	"testing"
	"testing/quick"
)

// Property 9: the wipe only ever selects user data.
func TestIsUserDataKey(t *testing.T) {
	tests := map[string]bool{
		"USER#abc":           true,
		"USER#dev-alice":     true,
		"USER#":              true,
		"CATALOGUE":          false,
		"":                   false,
		"USER":               false,
		"user#abc":           false,
		" USER#abc":          false,
		"CATALOGUE#USER#abc": false,
		"XUSER#abc":          false,
	}
	for pk, want := range tests {
		if got := isUserDataKey(pk); got != want {
			t.Errorf("isUserDataKey(%q) = %v, want %v", pk, got, want)
		}
	}

	matchesPrefix := func(pk string) bool {
		return isUserDataKey(pk) == strings.HasPrefix(pk, "USER#")
	}
	if err := quick.Check(matchesPrefix, nil); err != nil {
		t.Error(err)
	}
	prefixed := func(id string) bool { return isUserDataKey("USER#" + id) }
	if err := quick.Check(prefixed, nil); err != nil {
		t.Error(err)
	}
}
