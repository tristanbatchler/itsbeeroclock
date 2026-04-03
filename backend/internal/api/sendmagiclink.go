package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

type sendMagicLinkRequest struct {
	Email          string `json:"email"`
	TurnstileToken string `json:"turnstileToken"`
}

// SendMagicLinkHandler verifies a Turnstile token then triggers a Supabase OTP email.
// This keeps the Supabase service role key server-side and gates email sending behind CAPTCHA.
var SendMagicLinkHandler ApiProxyGatewayHandler = func(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	var body sendMagicLinkRequest
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil || body.Email == "" {
		return ErrorResponse(http.StatusBadRequest, "invalid request body")
	}

	if body.TurnstileToken == "" {
		return ErrorResponse(http.StatusForbidden, "missing captcha token")
	}

	ip := clientIP(req.Headers, req.RequestContext.Identity.SourceIP)
	if err := verifyTurnstile(body.TurnstileToken, ip); err != nil {
		log.Printf("SendMagicLinkHandler: turnstile failed for %s: %v", body.Email, err)
		return ErrorResponse(http.StatusForbidden, "captcha verification failed")
	}

	if err := supabaseSendOTP(body.Email); err != nil {
		log.Printf("SendMagicLinkHandler: supabase OTP failed for %s: %v", body.Email, err)
		return ErrorResponse(http.StatusInternalServerError, "failed to send login email")
	}

	return SuccessResponse(map[string]bool{"sent": true})
}

func supabaseSendOTP(email string) error {
	supabaseURL := utils.GetVar("SUPABASE_URL")
	serviceKey := utils.GetVar("SUPABASE_SECRET_KEY")
	if supabaseURL == "" || serviceKey == "" {
		return fmt.Errorf("supabase config missing")
	}

	payload, _ := json.Marshal(map[string]any{
		"email": email,
		"data":  map[string]any{},
	})

	client := &http.Client{Timeout: 10 * time.Second}
	httpReq, err := http.NewRequest(
		http.MethodPost,
		supabaseURL+"/auth/v1/otp",
		bytes.NewReader(payload),
	)
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("apikey", serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+serviceKey)

	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase returned %d", resp.StatusCode)
	}
	return nil
}
