package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/aws"
)

func adaptHandler(fn aws.ApiProxyGatewayHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		resp, err := fn(r.Context(), req)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		for k, v := range resp.Headers {
			w.Header().Set(k, v)
		}

		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
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

func main() {
	mux := http.NewServeMux()
	// Route all /api/* requests through the production router
	mux.HandleFunc("/api/", adaptHandler(aws.Router))

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
