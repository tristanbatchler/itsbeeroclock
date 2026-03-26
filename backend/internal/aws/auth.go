package aws

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/golang-jwt/jwt/v5"
)

var (
	jwksCache     *JWKS
	jwksCacheTime time.Time
	jwksMutex     sync.RWMutex
	cacheDuration = 24 * time.Hour
)

type JWKS struct {
	Keys []JSONWebKey `json:"keys"`
}

type JSONWebKey struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	X   string `json:"x"`
	Y   string `json:"y"`
	Crv string `json:"crv"`
}

func getJWKS() (*JWKS, error) {
	log.Printf("getJWKS called, cache age: %v", time.Since(jwksCacheTime))
	jwksMutex.RLock()
	if jwksCache != nil && time.Since(jwksCacheTime) < cacheDuration {
		jwksMutex.RUnlock()
		return jwksCache, nil
	}
	jwksMutex.RUnlock()

	jwksMutex.Lock()
	defer jwksMutex.Unlock()

	// Double-check after acquiring write lock
	if jwksCache != nil && time.Since(jwksCacheTime) < cacheDuration {
		return jwksCache, nil
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL not set")
	}

	resp, err := http.Get(supabaseURL + "/auth/v1/.well-known/jwks.json")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, err
	}

	jwksCache = &jwks
	jwksCacheTime = time.Now()
	return jwksCache, nil
}

func parseECPublicKey(xStr, yStr string, crv string) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(xStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode x coordinate: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(yStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode y coordinate: %w", err)
	}

	var curve elliptic.Curve
	switch crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, fmt.Errorf("unsupported curve: %s", crv)
	}

	publicKey := &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}
	return publicKey, nil
}

func VerifyJWT(tokenString string) (*AuthContext, error) {
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	jwks, err := getJWKS()
	if err != nil {
		return nil, err
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Find the key ID in the token header
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("no kid in token header")
		}

		// Find matching key in JWKS
		for _, key := range jwks.Keys {
			if key.Kid == kid {
				return parseECPublicKey(key.X, key.Y, key.Crv)
			}
		}
		return nil, fmt.Errorf("no matching key found for kid: %s", kid)
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID, ok := claims["sub"].(string)
		if !ok {
			return nil, fmt.Errorf("no sub claim")
		}
		email, _ := claims["email"].(string)

		return &AuthContext{
			UserID: userID,
			Email:  email,
		}, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func WithAuth(handler AuthenticatedApiProxyGatewayHandler) ApiProxyGatewayHandler {
	return func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		authHeader := req.Headers["Authorization"]
		if authHeader == "" {
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusUnauthorized,
				Body:       `{"error": "missing Authorization header"}`,
			}, nil
		}

		authCtx, err := VerifyJWT(authHeader)
		if err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusUnauthorized,
				Body:       fmt.Sprintf(`{"error": "invalid token: %s"}`, err.Error()),
			}, nil
		}

		return handler(ctx, authCtx, req)
	}
}
