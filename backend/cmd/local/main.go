package main

import (
	"context"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"syscall"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/api"
)

var devUserPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

func adaptHandler(fn api.ApiProxyGatewayHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🔵 adaptHandler called for path: %s", r.URL.Path)
		req := events.APIGatewayProxyRequest{
			HTTPMethod:            r.Method,
			Path:                  r.URL.Path,
			Headers:               make(map[string]string),
			QueryStringParameters: make(map[string]string),
		}

		for k, v := range r.Header {
			if len(v) > 0 {
				req.Headers[k] = v[0]
			}
		}

		for k, v := range r.URL.Query() {
			if len(v) > 0 {
				req.QueryStringParameters[k] = v[0]
			}
		}

		if r.Body != nil {
			bodyBytes, _ := io.ReadAll(r.Body)
			req.Body = string(bodyBytes)
		}

		log.Printf("🟢 Calling aws.Router with path: %s", req.Path)
		resp, err := fn(r.Context(), req)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		for k, v := range resp.Headers {
			w.Header().Set(k, v)
		}
		for k, values := range resp.MultiValueHeaders {
			for _, v := range values {
				w.Header().Add(k, v)
			}
		}

		corsOrigin := os.Getenv("CORS_ORIGIN")
		if corsOrigin == "" {
			corsOrigin = "http://localhost:5173"
		}

		w.Header().Set("Access-Control-Allow-Origin", corsOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.WriteHeader(resp.StatusCode)
		w.Write([]byte(resp.Body))
	}
}

// devLogin signs in a fake user without Google, for browser tests against DynamoDB
// Local. It isn't in the shared routes table, so the Lambda has no such route.
// The dev- prefix keeps test IDs apart from real Google subjects.
func devLogin(w http.ResponseWriter, r *http.Request) {
	user := r.URL.Query().Get("user")
	if !devUserPattern.MatchString(user) {
		http.Error(w, "pass ?user=<letters, digits, - or _>", http.StatusBadRequest)
		return
	}

	cookie, err := api.IssueSessionCookie("dev-" + user)
	if err != nil {
		log.Printf("devLogin: %v", err)
		http.Error(w, "couldn't create a session: check SESSION_SECRET", http.StatusInternalServerError)
		return
	}
	w.Header().Add("Set-Cookie", cookie)
	http.Redirect(w, r, "/profile", http.StatusFound)
}

func main() {
	prod := flag.Bool("prod", false, "use the real DynamoDB table instead of DynamoDB Local")
	flag.Parse()
	api.RequireLocalDynamoDB(*prod)

	mux := http.NewServeMux()
	// Route all /api/* requests through the production router
	mux.HandleFunc("/api/", adaptHandler(api.Router))
	// RequireLocalDynamoDB has confirmed DYNAMODB_ENDPOINT is set unless -prod was passed.
	if !*prod {
		mux.HandleFunc("/api/dev/login", devLogin)
	}

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Starting server on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Error starting server: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Error shutting down server: %v", err)
	}
	log.Println("Server gracefully stopped")
}
