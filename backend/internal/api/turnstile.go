package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

type turnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
	Action     string   `json:"action"`
	Hostname   string   `json:"hostname"`
}

// verifyTurnstile calls the Cloudflare Siteverify API.
// ip is optional — pass the client IP from the request headers if available.
func verifyTurnstile(token, ip string) error {
	secret := utils.GetVar("CF_TURNSTILE_SECRET_KEY")
	if secret == "" {
		return fmt.Errorf("CF_TURNSTILE_SECRET_KEY not configured")
	}

	body, _ := json.Marshal(map[string]string{
		"secret":   secret,
		"response": token,
		"remoteip": ip,
	})

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		log.Printf("verifyTurnstile: request failed: %v", err)
		return fmt.Errorf("turnstile verification request failed")
	}
	defer resp.Body.Close()

	var result turnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("verifyTurnstile: failed to decode response: %v", err)
		return fmt.Errorf("turnstile response decode failed")
	}

	if !result.Success {
		log.Printf("verifyTurnstile: failed, error codes: %v", result.ErrorCodes)
		return fmt.Errorf("turnstile verification failed")
	}

	return nil
}

// clientIP extracts the real client IP from Lambda request headers.
// API Gateway sets X-Forwarded-For; fall back to sourceIp from the request context.
func clientIP(headers map[string]string, sourceIP string) string {
	if xff := headers["X-Forwarded-For"]; xff != "" {
		return xff
	}
	if xff := headers["x-forwarded-for"]; xff != "" {
		return xff
	}
	return sourceIP
}
