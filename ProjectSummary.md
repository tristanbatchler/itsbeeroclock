# Project Summary


## backend/build_lambda.sh

```bash
#!/bin/sh
set -e

printf "Building api Lambda...\n"
GOOS=linux GOARCH=arm64 go build -o "cmd/api/bootstrap" "./cmd/api"
zip -j "./deployment.zip" "cmd/api/bootstrap"
rm -f "cmd/api/bootstrap"
printf "  -> ./deployment.zip\n"

echo "All Lambdas built."
exit 0
```

## backend/cmd/api/main.go

```go
package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/aws"
)

func main() {
	lambda.Start(aws.Router)
}

```

## backend/cmd/local/main.go

```go
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
	mux.HandleFunc("GET /api/health", adaptHandler(aws.HealthHandler))
	mux.HandleFunc("POST /api/drinks", adaptHandler(aws.AddDrinkHandler))

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

```

## backend/internal/aws/adddrinkfn.go

```go
// backend/internal/aws/adddrinkfn.go
package aws

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
)

var AddDrinkHandler ApiProxyGatewayHandler = func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// AuthContext is passed via the router's WithAuth – you can extract it if needed
	// For now, just handle the request
	log.Printf("Received AddDrink request with body: %s", req.Body)

	body, err := json.Marshal(AppResponse{Message: "Drink added successfully!"})
	if err != nil {
		return events.APIGatewayProxyResponse{}, err
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}

```

## backend/internal/aws/auth.go

```go
package aws

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
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

```

## backend/internal/aws/healthfn.go

```go
package aws

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
)

var HealthHandler ApiProxyGatewayHandler = func(ctx context.Context, apr events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	body, err := json.Marshal(AppResponse{Message: "Beer O'Clock is healthy!"})
	if err != nil {
		return events.APIGatewayProxyResponse{}, err
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}

```

## backend/internal/aws/router.go

```go
package aws

import (
	"context"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
)

var Router ApiProxyGatewayHandler = func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Public routes
	if req.Path == "/api/health" && req.HTTPMethod == "GET" {
		return HealthHandler(ctx, req)
	}

	// Protected routes
	return WithAuth(func(ctx context.Context, authCtx *AuthContext, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		switch {
		case req.Path == "/api/drinks" && req.HTTPMethod == "POST":
			return AddDrinkHandler(ctx, req)
		default:
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusNotFound,
				Body:       `{"error": "route not found"}`,
			}, nil
		}
	})(ctx, req)
}

```

## backend/internal/aws/types.go

```go
package aws

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
)

type ApiProxyGatewayHandler func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

type AuthContext struct {
	UserID string
	Email  string
}

type AuthenticatedApiProxyGatewayHandler func(context.Context, *AuthContext, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

type AppResponse struct {
	Message string `json:"message"`
}

```

## frontend/src/App.tsx

```
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Root } from './Root';
import { Home } from './pages/Home'; 
import { AuthCallback } from './pages/AuthCallback';
import { History } from './pages/History'; 
import { Profile } from './pages/Profile'; 
import { AddBeer } from './pages/AddBeer'; 
import { Privacy } from './pages/Privacy';
import { TOS } from './pages/TOS';
import { SignIn } from './pages/SignIn';

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />}>
            <Route index element={<Home />} />
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
            <Route path="add-beer" element={<AddBeer />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="tos" element={<TOS />} />
            <Route path="auth/callback" element={<AuthCallback />} />
            <Route path="sign-in" element={<SignIn />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

## frontend/src/Root.tsx

```
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Beer, User, History as HistoryIcon, Home as HomeIcon } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';

export function Root() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Track' },
    { path: '/history', icon: HistoryIcon, label: 'History' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-linear-to-br from-yellow-400 via-amber-400 to-yellow-500 dark:from-yellow-500 dark:via-yellow-400 dark:to-amber-500 text-zinc-900 shadow-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black/10 backdrop-blur-sm p-2 rounded-2xl">
                <Beer className="size-8" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Beer O'clock</h1>
                <p className="text-zinc-800 dark:text-zinc-900 text-xs font-medium">Queensland's Drink Tracker</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 border-t border-border shadow-2xl backdrop-blur-xl z-40">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1.5 py-3 px-6 transition-all rounded-2xl my-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`size-6 ${isActive ? 'animate-bounce' : ''}`} strokeWidth={2.5} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
```

## frontend/src/components/BeerSelector.tsx

```
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X, Search, Star, Plus, Beer as BeerIcon } from 'lucide-react';
import type { Beer } from '../types/drinks';
import { DEFAULT_BEERS } from '../data/defaultBeers'; 
import { getCustomBeers, getFavoriteIds, toggleFavorite } from '../utils/storage'; 
import { Input } from './Input'; 
import { Button } from './Button'; 
import { Card } from './Card'; 

interface Props {
  onSelect: (beer: Beer) => void;
  onClose: () => void;
}

export function BeerSelector({ onSelect, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavoriteIds);
  const [customBeers] = useState<Beer[]>(getCustomBeers);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  const allBeers = useMemo(() => [...DEFAULT_BEERS, ...customBeers], [customBeers]);

  const filteredBeers = useMemo(() => {
    let beers = allBeers;
    if (activeTab === 'favorites') beers = beers.filter(b => favoriteIds.includes(b.id));
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      beers = beers.filter(b => b.name.toLowerCase().includes(query) || b.brewery?.toLowerCase().includes(query));
    }
    return beers;
  }, [allBeers, favoriteIds, activeTab, searchQuery]);

  const handleToggleFavorite = (beerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(beerId);
    setFavoriteIds(getFavoriteIds());
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-border">
        <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl"><BeerIcon className="size-5 text-primary" /></div>
            <h2 className="text-xl font-bold">Select a Beer</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl"><X className="size-5" /></Button>
        </div>

        <div className="p-4 border-b border-border relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            placeholder="Search beers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
            autoFocus
          />
        </div>

        {/* Simple Tab Implementation to avoid external dependencies */}
        <div className="flex p-4 gap-2 border-b border-border bg-muted/20">
          <Button variant={activeTab === 'all' ? 'default' : 'outline'} onClick={() => setActiveTab('all')} className="flex-1">
            All Beers
          </Button>
          <Button variant={activeTab === 'favorites' ? 'default' : 'outline'} onClick={() => setActiveTab('favorites')} className="flex-1">
            <Star className="size-4 mr-2" /> Favorites ({favoriteIds.length})
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredBeers.map(beer => {
            const isFav = favoriteIds.includes(beer.id);
            return (
              <Card key={beer.id} className="p-4 cursor-pointer hover:border-primary/30 transition-all border-2 border-transparent" onClick={() => onSelect(beer)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-base">{beer.name}</p>
                      {beer.isCustom && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-lg font-semibold">Custom</span>}
                    </div>
                    {beer.brewery && <p className="text-sm text-muted-foreground">{beer.brewery}</p>}
                    <p className="text-sm font-semibold text-primary mt-1">{beer.abv}% ABV</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => handleToggleFavorite(beer.id, e)}>
                    <Star className={`size-6 transition-all ${isFav ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </Card>
            );
          })}

          {filteredBeers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BeerIcon className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold mb-1">No beers found</p>
              {searchQuery && (
                <Link to="/add-beer" onClick={onClose}>
                  <Button variant="outline" className="mt-4"><Plus className="size-4 mr-2" /> Add Custom Beer</Button>
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/30">
          <Link to="/add-beer" onClick={onClose}>
            <Button variant="outline" className="w-full"><Plus className="size-5 mr-2" /> Add Custom Beer</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

## frontend/src/components/BeerSizeIcons.tsx

```
export function PotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2h8v3H8z" />
      <path d="M9 5v13c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2V5" />
      <path d="M7 8h10" />
    </svg>
  );
}

export function SchonerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 2h10v3H7z" />
      <path d="M8 5v14c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V5" />
      <path d="M6 9h12" />
      <path d="M6 14h12" />
    </svg>
  );
}

export function PintIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2h12v3H6z" />
      <path d="M7 5v15c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V5" />
      <path d="M5 10h14" />
      <path d="M5 15h14" />
    </svg>
  );
}

export function CanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="7" y="3" width="10" height="18" rx="1" />
      <path d="M7 7h10" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

export function BottleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2h4v3h-4z" />
      <path d="M9 5v2h6V5" />
      <path d="M8 7v12c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V7" />
    </svg>
  );
}
```

## frontend/src/components/Button.tsx

```
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-2xl text-sm font-bold transition-all focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
    };
    const sizes = {
      default: "h-12 px-4 py-2",
      sm: "h-9 rounded-xl px-3",
      lg: "h-16 rounded-2xl px-8 text-lg",
      icon: "h-10 w-10",
    };
    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

## frontend/src/components/Card.tsx

```
import * as React from "react";

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl border bg-card text-card-foreground shadow-sm ${className}`} {...props} />;
}
```

## frontend/src/components/DrinkLog.tsx

```
import type { Drink } from '../types/drinks';
import { X } from 'lucide-react';
import { getDrinkDisplay } from '../utils/calculations';
import { DEFAULT_BEERS } from '../data/defaultBeers';
import { formatRelativeTime } from '../utils/time';
import { Card } from './Card';
import { Button } from './Button';


interface Props {
  drinks: Drink[];
  onUndo: () => void;
  onRemoveDrink: (id: string) => void;
  onClear: () => void;
}

export function DrinkLog({ drinks, onUndo, onRemoveDrink, onClear }: Props) {

  const sortedDrinks = [...drinks].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
        <h2 className="text-primary font-bold text-xl uppercase tracking-tighter">History</h2>
        <div className="flex flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onUndo}
            className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest"
            disabled={drinks.length === 0}
          >
            [ Undo Last ]
          </Button>
          <Button
            variant="destructive"
            onClick={onClear}
            className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest"
            disabled={drinks.length === 0}
          >
            [ Clear All ]
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
        {sortedDrinks.map((drink) => {
          const display = getDrinkDisplay(drink, DEFAULT_BEERS);
          return (
            <Card key={drink.id} className="p-4 flex justify-between items-center border-l-4 border-primary">
              <div>
                <div className="font-bold text-foreground leading-tight">{display.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
                  {display.size} · {formatRelativeTime(drink.timestamp)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-bold text-2xl text-primary">
                    {display.standardDrinks.toFixed(1)}
                  </div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black">Std Drinks</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onRemoveDrink(drink.id)} aria-label="Remove drink">
                  <X className="size-4 text-muted-foreground hover:text-red-500" />
                </Button>
              </div>
            </Card>
          );
        })}
        {drinks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-xs italic">No drinks logged yet.</div>
        )}
      </div>
    </div>
  );
}
```

## frontend/src/components/DrinkSizeSelector.tsx

```
import { DRINK_SIZES, type DrinkSize } from '../types/drinks';
import { Button } from './Button';
import { PotIcon, SchonerIcon, PintIcon, CanIcon, BottleIcon } from './BeerSizeIcons';

interface Props {
  selectedSize: DrinkSize;
  onSelectSize: (size: DrinkSize) => void;
}

const BAR_SIZES: DrinkSize[] = ['pot', 'schooner', 'pint'];
const sizeIcons: Record<DrinkSize, React.ElementType> = {
  pot: PotIcon,
  schooner: SchonerIcon,
  pint: PintIcon,
  jug: PintIcon, // Placeholders
  tinnie: CanIcon,
  can440: CanIcon,
  bottle330: BottleIcon,
  bottle375: BottleIcon,
  longneck: BottleIcon,
};

export function DrinkSizeSelector({ selectedSize, onSelectSize }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-lg">
            <PintIcon className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-bold text-foreground/80">At the Bar</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {BAR_SIZES.map(size => {
            const ml = DRINK_SIZES[size];
            const label = size.charAt(0).toUpperCase() + size.slice(1);
            const Icon = sizeIcons[size];
            return (
              <Button
                key={size}
                variant={selectedSize === size ? 'default' : 'outline'}
                onClick={() => onSelectSize(size)}
                className={`flex flex-col h-auto py-4 gap-2 transition-all ${
                  selectedSize === size ? 'shadow-lg ring-2 ring-primary/20' : ''
                }`}
              >
                <Icon className="size-8" />
                <div>
                  <span className="font-bold text-base block">{label}</span>
                  <span className="text-xs opacity-80">{ml}ml</span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
      {/* Similar implementation for PACKAGE_SIZES can be mirrored here if needed! */}
    </div>
  );
}
```

## frontend/src/components/Input.tsx

```
import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', type, ...props }, ref) => { 
    return (
      <input
        type={type}
        className={`flex h-12 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input";
```

## frontend/src/components/ThemeToggle.tsx

```
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 bg-background/50 rounded-full">
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
```

## frontend/src/data/defaultBeers.ts

```typescript
import type { Beer } from '../types/drinks';

export const DEFAULT_BEERS: Beer[] = [
  { id: 'xxxx-gold',           name: 'XXXX Gold',               brewery: 'XXXX',             abv: 3.5 },
  { id: 'xxxx-bitter',         name: 'XXXX Bitter',             brewery: 'XXXX',             abv: 4.6 },
  { id: 'great-northern-orig', name: 'Great Northern Original', brewery: 'Great Northern',   abv: 3.5 },
  { id: 'great-northern-sc',   name: 'Great Northern Super Crisp', brewery: 'Great Northern', abv: 4.2 },
  { id: 'vb',                  name: 'Victoria Bitter',         brewery: 'CUB',              abv: 4.9 },
  { id: 'carlton-dry',         name: 'Carlton Dry',             brewery: 'CUB',              abv: 4.5 },
  { id: 'stone-wood-pacific',  name: 'Pacific Ale',             brewery: 'Stone & Wood',     abv: 4.4 },
  { id: 'balter-xpa',          name: 'XPA',                     brewery: 'Balter',           abv: 5.0 },
  { id: 'burleigh-bighead',    name: 'Bighead',                 brewery: 'Burleigh Brewing', abv: 3.5 },
  { id: 'coopers-pale',        name: 'Pale Ale',                brewery: 'Coopers',          abv: 4.5 },
  { id: 'demo-beer',           name: 'Demo Beer',               brewery: 'Demo Brewery',     abv: 4.8 },
];
```

## frontend/src/hooks/useAuth.ts

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ 
    provider: 'google', 
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline', 
        prompt: 'consent',
      },
    },
  });
  const signInWithApple = () => supabase.auth.signInWithOAuth({ provider: 'apple' });
  const signInWithMagicLink = (email: string) => supabase.auth.signInWithOtp({ email });
  const signOut = () => supabase.auth.signOut();

  return { user, loading, signInWithGoogle, signInWithApple, signInWithMagicLink, signOut };
}
```

## frontend/src/hooks/useBAC.ts

```typescript
import { useState, useEffect, useMemo } from 'react';
import type { Drink, Beer, UserProfile } from '../types/drinks';
import { getStandardDrinks, calculateBAC, calculateTimeUntilSober } from '../utils/calculations';

export function useBAC(drinks: Drink[], beers: Beer[], profile: UserProfile | null) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const totalStandardDrinks = useMemo(() => 
    drinks.reduce((sum, d) => {
      const beer = beers.find(b => b.id === d.beerId);
      return sum + (beer ? getStandardDrinks(d, beer) : 0);
    }, 0), [drinks, beers]
  );

  const getGramsAlcohol = (d: Drink) => {
    const beer = beers.find(b => b.id === d.beerId);
    return beer ? getStandardDrinks(d, beer) * 10 : 0;
  };

  const currentBAC = calculateBAC(drinks, profile, currentTime, getGramsAlcohol);
  const { canDrive, hoursUntilSober, soberTime } = calculateTimeUntilSober(drinks, profile, currentTime, getGramsAlcohol);

  return { totalStandardDrinks, currentBAC, canDrive, hoursUntilSober, soberTime };
}
```

## frontend/src/hooks/useSession.ts

```typescript
import { useState, useEffect } from 'react';
import { type Drink } from '../types/drinks';

const SESSION_KEY = 'beeroclock_session';

function loadSession(): Drink[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSession(drinks: Drink[]) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(drinks));
}

export function useSession() {
  const [drinks, setDrinks] = useState<Drink[]>(loadSession);

  useEffect(() => {
    saveSession(drinks);
  }, [drinks]);

  const addDrink = (drink: Drink) => {
    setDrinks(prev => [...prev, drink]);
  };

  const undoLast = () => {
    setDrinks(prev => prev.slice(0, -1));
  };

  const removeDrink = (id: string) => {
    setDrinks(prev => prev.filter(d => d.id !== id));
  };

  const clearSession = () => {
    setDrinks([]);
  };

  return { drinks, addDrink, removeDrink, undoLast, clearSession };
}
```

## frontend/src/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## frontend/src/main.tsx

```
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

## frontend/src/pages/AddBeer.tsx

```
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveCustomBeer } from '../utils/storage';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function AddBeer() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [brewery, setBrewery] = useState('');
  const [abv, setAbv] = useState('5.0');

  const handleSave = () => {
    if (!name.trim() || !abv) return;
    
    saveCustomBeer({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      brewery: brewery.trim() || 'Custom',
      abv: parseFloat(abv),
      isCustom: true,
    });
    
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Add Custom Beer</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Beer Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Hazy IPA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Brewery (optional)</label>
            <Input
              value={brewery}
              onChange={(e) => setBrewery(e.target.value)}
              placeholder="Local Brew Co"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ABV (%)</label>
            <Input
              type="number"
              step="0.1"
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder="5.0"
            />
          </div>

          <Button onClick={handleSave} className="w-full mt-4">
            Save Beer
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

## frontend/src/pages/AuthCallback.tsx

```
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
```

## frontend/src/pages/History.tsx

```
import { Card } from '../components/Card';

export function History() {
  return (
    <div className="p-6 space-y-6">
      <Card className="p-8 text-center bg-muted/30 shadow-sm border-dashed">
        <h2 className="text-2xl font-bold mb-2">History</h2>
        <p className="text-muted-foreground">Coming soon</p>
      </Card>
    </div>
  );
}
```

## frontend/src/pages/Home.tsx

```
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, Sparkles, AlertTriangle, CheckCircle2, Clock, } from 'lucide-react';
import { DEFAULT_BEERS } from '../data/defaultBeers'; 
import { useSession } from '../hooks/useSession';


import {
  getCustomBeers,
  getFavoriteIds,
  getRecentBeerIds,
  addRecentBeer,
  getUserProfile,
} from '../utils/storage';

import { useBAC } from '../hooks/useBAC';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DrinkLog } from '../components/DrinkLog';
import { DrinkSizeSelector } from '../components/DrinkSizeSelector';
import { BeerSelector } from '../components/BeerSelector';
import { type DrinkSize, type Beer, type Drink } from '../types/drinks';
import { formatHours } from '../utils/time';

export function Home() {
  const { drinks, addDrink, removeDrink, clearSession, undoLast } = useSession();
  const [selectedSize, setSelectedSize] = useState<DrinkSize>('schooner');
  const [showBeerSelector, setShowBeerSelector] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const profile = getUserProfile();
  const allBeers = [...DEFAULT_BEERS, ...getCustomBeers()];
  const favoriteIds = getFavoriteIds();
  const recentIds = getRecentBeerIds();

  const [selectedBeer, setSelectedBeer] = useState<Beer | null>(() => {
    const recent = recentIds.map((id: string) => allBeers.find(b => b.id === id)).filter(Boolean)[0] as Beer | undefined;
    const favorite = allBeers.find(b => favoriteIds.includes(b.id));
    return recent || favorite || allBeers[0] || null;
  });

  const recentBeers = recentIds.map((id: string) => allBeers.find(b => b.id === id)).filter(Boolean) as Beer[];

  const handleAddDrink = () => {
    if (!selectedBeer) return setShowBeerSelector(true);
    const drink: Drink = {
      id: crypto.randomUUID(),
      beerId: selectedBeer.id,
      beerName: selectedBeer.name,
      size: selectedSize,
      timestamp: Date.now(),
    };
    addDrink(drink);
    addRecentBeer(selectedBeer.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const { totalStandardDrinks, currentBAC, canDrive, hoursUntilSober, soberTime } = useBAC(drinks, allBeers, profile);

  return (
    <div className="space-y-6">
      {!profile && (
        <Card className="p-5 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-800 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white p-2 rounded-xl"><Sparkles className="size-5" /></div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Get the full experience</p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">Set up your profile to see BAC estimates.</p>
              <Link to="/profile"><Button size="sm" className="shadow-md">Set Up Profile</Button></Link>
            </div>
          </div>
        </Card>
      )}

      {profile && drinks.length > 0 && (
        <Card className={`p-5 border-2 shadow-xl ${canDrive ? 'bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700' : 'bg-linear-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 border-red-400 dark:border-red-700'}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${canDrive ? 'bg-green-500' : 'bg-red-500'}`}>
              {canDrive ? <CheckCircle2 className="size-6 text-white" strokeWidth={3} /> : <AlertTriangle className="size-6 text-white" strokeWidth={3} />}
            </div>
            <div className="flex-1">
              <p className={`font-bold text-lg ${canDrive ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                {canDrive ? '✓ Safe to drive' : '⚠️ Do NOT drive'}
              </p>
              <p className={`text-sm mt-1 ${canDrive ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}`}>
                {canDrive ? `Under limit (${currentBAC.toFixed(3)}% BAC)` : `Wait ${formatHours(hoursUntilSober)} until ${soberTime?.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-linear-to-br from-card to-muted/30 shadow-xl border-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-primary/20 p-2 rounded-xl"><Plus className="size-5 text-primary" strokeWidth={3} /></div>
          <h2 className="font-bold text-lg">Quick Add Drink</h2>
        </div>
        
        <div className="mb-5">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">What are you drinking?</p>
          <button onClick={() => setShowBeerSelector(true)} className="w-full p-4 bg-primary/10 hover:bg-primary/20 rounded-2xl flex items-center justify-between transition-all group border-2 border-transparent hover:border-primary/30">
            <div className="text-left">
              <p className="font-bold text-lg">{selectedBeer?.name}</p>
              {selectedBeer?.brewery && <p className="text-sm text-muted-foreground">{selectedBeer.brewery}</p>}
              <p className="text-sm font-semibold text-primary mt-1">{selectedBeer?.abv}% ABV</p>
            </div>
            <div className="bg-primary/20 group-hover:bg-primary/30 p-2 rounded-xl"><Star className="size-5 text-primary" /></div>
          </button>
        </div>

        <div className="mb-5">
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">What size?</p>
          <DrinkSizeSelector selectedSize={selectedSize} onSelectSize={setSelectedSize} />
        </div>

        <Button onClick={handleAddDrink} className="w-full h-16 text-lg shadow-xl hover:shadow-2xl transition-all" size="lg">
          {justAdded ? <><CheckCircle2 className="size-6 mr-2" strokeWidth={3} /> Added!</> : <><Plus className="size-6 mr-2" strokeWidth={3} /> Add Drink</>}
        </Button>
      </Card>

      {recentBeers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-muted p-1.5 rounded-lg"><Clock className="size-4 text-muted-foreground" /></div>
            <h3 className="font-bold text-sm">Recently Had</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recentBeers.map((beer: Beer) => (
              <Card key={beer.id} className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-102 border-2 ${selectedBeer?.id === beer.id ? 'border-primary bg-primary/10' : 'border-transparent'}`} onClick={() => setSelectedBeer(beer)}>
                <p className="font-semibold text-sm line-clamp-1">{beer.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{beer.abv}% ABV</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {profile && drinks.length > 0 && (
        <Card className="p-6 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Current BAC</p>
              <p className="text-3xl font-bold text-primary">{currentBAC.toFixed(3)}%</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Std Drinks</p>
              <p className="text-3xl font-bold text-primary">{totalStandardDrinks.toFixed(1)}</p>
            </div>
          </div>
        </Card>
      )}
      <DrinkLog drinks={drinks} onUndo={undoLast} onRemoveDrink={(id => removeDrink(id))} onClear={clearSession} />
      {showBeerSelector && <BeerSelector onSelect={(beer: Beer) => { setSelectedBeer(beer); setShowBeerSelector(false); }} onClose={() => setShowBeerSelector(false)} />}
    </div>
  );
}
```

## frontend/src/pages/Privacy.tsx

```
import { Card } from '../components/Card';

export function Privacy() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">Last updated: 27 March 2026</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold mb-2">Data We Collect</h2>
            <p>Beer O'Clock collects your email address, weight, gender, and drinking sessions only with your explicit consent.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-2">How We Use Data</h2>
            <p>Your data is used exclusively to provide BAC estimates and for you to track your drinking history across multiple devices. 
                We <strong>never</strong> share your data with third parties.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-2">Data Storage</h2>
            <p>All data is stored securely. You can delete your data at any time by contacting <a href="mailto:support@itsbeeroclock.au" className="text-blue-500">support@beeroclock.com</a>.</p>
          </section>
        </div>
      </Card>
    </div>
  );
}
```

## frontend/src/pages/Profile.tsx

```
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, saveUserProfile } from '../utils/storage';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Link } from 'react-router-dom';

export function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const existing = getUserProfile();
  const [gender, setGender] = useState<'male' | 'female'>(existing?.gender || 'male');
  const [weight, setWeight] = useState(existing?.weight?.toString() || '80');
  const [optInHistory, setOptInHistory] = useState(existing?.optInHistory || false);

  const handleSave = () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) return;
    saveUserProfile({ gender, weight: weightNum, optInHistory });
    navigate('/');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-40">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Card className="p-6 w-full max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Sign in to save your data</h2>
          <Link to="/sign-in">
            <Button className="w-full">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Details</h2>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Used to calculate accurate BAC estimates
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <div className="flex gap-4">
              {(['male', 'female'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`px-6 py-2 rounded-xl font-medium transition-all ${
                    gender === g 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Weight (kg)</label>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="80"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={optInHistory}
              onChange={(e) => setOptInHistory(e.target.checked)}
              className="size-5 rounded border-border accent-primary"
            />
            <span className="text-sm">Save my drinking history</span>
          </label>

          <Button onClick={handleSave} className="w-full mt-4">
            Save Profile
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

## frontend/src/pages/SignIn.tsx

```
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Mail, ArrowRight } from 'lucide-react';

export function SignIn() {
  const { signInWithGoogle, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    await signInWithMagicLink(email);
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Card className="p-8 max-w-md text-center">
          <Mail className="size-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground">
            We sent a magic link to <span className="font-medium">{email}</span>
          </p>
          <Button 
            onClick={() => { setSent(false); setEmail(''); }} 
            className="mt-6" 
            variant="outline"
          >
            Send to another email
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Sign in to Beer O'Clock</h1>

        <Button onClick={signInWithGoogle} className="w-full mb-6 h-12">
          Continue with Google
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
            <span className="bg-card px-4">or</span>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleMagicLink} disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send magic link'}
            {!loading && <ArrowRight className="ml-2 size-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

## frontend/src/pages/TOS.tsx

```
import { Card } from '../components/Card';

export function TOS() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-4">Last updated: 27 March 2026</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. BAC Estimates</h2>
            <p>BAC calculations are estimates only. Never drink and drive. Always use a certified breathalyzer.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-2">2. Privacy</h2>
            <p>We respect your privacy. All data is opt-in and can be deleted at any time.</p>
          </section>
        </div>
      </Card>
    </div>
  );
}
```

## frontend/src/types/drinks.ts

```typescript

export interface UserProfile {
  gender: 'male' | 'female';
  weight: number;
  optInHistory: boolean;
}

export const DRINK_SIZES = {
  pot: 285,
  schooner: 425,
  pint: 570,
  jug: 1140,
  tinnie: 375,
  can440: 440,
  bottle330: 330,
  bottle375: 375,
  longneck: 750,
} as const;

export type DrinkSize = keyof typeof DRINK_SIZES;

export const DRINK_LABELS: Record<DrinkSize, string> = {
  pot: 'Pot',
  schooner: 'Schooner',
  pint: 'Pint',
  jug: 'Jug',
  tinnie: 'Tinnie',
  can440: 'Can 440ml',
  bottle330: '330ml Bottle',
  bottle375: '375ml Stubby',
  longneck: 'Longneck',
};



export interface Beer {
  id: string;
  name: string;
  brewery?: string;
  abv: number; // percent
  imageUrl?: string;
  isCustom?: boolean;
}

export interface Drink {
  id: string;
  beerId: string;
  beerName: string;
  size: DrinkSize;
  timestamp: number;
}

```

## frontend/src/utils/calculations.ts

```typescript
import { DRINK_SIZES, DRINK_LABELS, type Drink, type UserProfile, type Beer } from '../types/drinks'; 


export function calcStandardDrinks(ml: number, abvPercent: number): number {
  return (ml * (abvPercent / 100) * 0.789) / 10;
}

export function getStandardDrinks(drink: Drink, beer: Beer) {
  return calcStandardDrinks(DRINK_SIZES[drink.size], beer.abv);
}

export function getDrinkDisplay(drink: Drink, beers: Beer[]) {
  const beer = beers.find(b => b.id === drink.beerId);
  return {
    name: drink.beerName,
    size: drink.size in DRINK_LABELS ? DRINK_LABELS[drink.size] : drink.size,
    standardDrinks: beer ? getStandardDrinks(drink, beer) : 0,
  };
}

export function calculateBAC(drinks: Drink[], profile: UserProfile | null, currentTime: number, getGramsAlcohol: (d: Drink) => number): number {
  if (!profile || drinks.length === 0) return 0;

  const r = profile.gender === 'male' ? 0.68 : 0.55;
  const weightGrams = profile.weight * 1000;
  const totalGramsAlcohol = drinks.reduce((sum, d) => sum + getGramsAlcohol(d), 0);

  const firstDrinkTime = Math.min(...drinks.map(d => d.timestamp));
  const hoursSinceStart = (currentTime - firstDrinkTime) / (1000 * 60 * 60);

  const rawBac = (totalGramsAlcohol / (weightGrams * r)) * 100;
  const finalBac = rawBac - (0.015 * hoursSinceStart);

  return Math.max(0, finalBac);
}

export function calculateTimeUntilSober(drinks: Drink[], profile: UserProfile | null, currentTime: number, getGramsAlcohol: (d: Drink) => number) {
  const bac = calculateBAC(drinks, profile, currentTime, getGramsAlcohol);
  const legalLimit = 0.05;

  if (bac <= legalLimit) return { canDrive: true, hoursUntilSober: 0, soberTime: null };

  const hours = (bac - legalLimit) / 0.015;
  const soberTime = new Date(currentTime + hours * 60 * 60 * 1000);

  return { canDrive: false, hoursUntilSober: hours, soberTime };
}
```

## frontend/src/utils/storage.ts

```typescript

import type { Beer, UserProfile } from '../types/drinks';

const PROFILE_KEY = 'beeroclock_profile';
const CUSTOM_BEERS_KEY = 'beeroclock_custom_beers';
const FAVORITE_IDS_KEY = 'beeroclock_favorite_ids';
const RECENT_IDS_KEY = 'beeroclock_recent_ids';

const safeParse = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Profile
export const getUserProfile = (): UserProfile | null => {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && (parsed.gender === 'male' || parsed.gender === 'female') && typeof parsed.weight === 'number') {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to parse profile from localStorage, returning null.", error);
  }
  return null;
};

export const saveUserProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};



// Custom Beers
export const getCustomBeers = (): Beer[] => safeParse(CUSTOM_BEERS_KEY, []);

export const saveCustomBeer = (beer: Beer) => {
  const beers = getCustomBeers();
  localStorage.setItem(CUSTOM_BEERS_KEY, JSON.stringify([...beers, beer]));
};

// Favorites
export const getFavoriteIds = (): string[] => safeParse(FAVORITE_IDS_KEY, []);

export const toggleFavorite = (beerId: string) => {
  const favorites = getFavoriteIds();
  const newFavorites = favorites.includes(beerId)
    ? favorites.filter(id => id !== beerId)
    : [...favorites, beerId];
  localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify(newFavorites));
};

// Recents
export const getRecentBeerIds = (): string[] => safeParse(RECENT_IDS_KEY, []);

export const addRecentBeer = (beerId: string) => {
  const recents = getRecentBeerIds();
  const newRecents = [beerId, ...recents.filter(id => id !== beerId)].slice(0, 10);
  localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(newRecents));
};
```

## frontend/src/utils/time.ts

```typescript
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.ceil(hours * 60);
    return `${minutes}m`;
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.ceil((hours - wholeHours) * 60);
  
  if (minutes > 0) {
    return `${wholeHours}h ${minutes}m`;
  }
  return `${wholeHours}h`;
}
```

## frontend/src/vite-env.d.ts

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_PUBLISHABLE_KEY: string
  readonly SUPABASE_SECRET_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## infra/package.json

```json
{
  "dependencies": {
    "aws-cdk": "^2.1113.0"
  }
}

```

## package.json

```json
{
  "scripts": {
    "build": "cd frontend && npm run build && cd ../backend && ./build_lambda.sh",
    "deploy": "npm run build && cd infra/cdk && npx cdk deploy --require-approval never",
    "dev": "cd frontend && npm run dev"
  }
}

```
