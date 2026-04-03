# Beer O'Clock

![Deploy](https://github.com/tristanbatchler/itsbeeroclock/actions/workflows/deploy.yml/badge.svg)
[![Live](https://img.shields.io/badge/Live-itsbeeroclock.au-green)](https://itsbeeroclock.au)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Go%20%7C%20AWS-black)

Beer O'Clock lets Queenslanders confidently track their nights out with a stupid-simple interface for logging pots, pints, and schooners. If a drink can't be logged in under 5 seconds, it's too hard.

## Core principles

- Log the first drink in under 5 seconds.
- Usable even while intoxicated.
- Everything opt-in by default.

## Session lifecycle

A session begins when the first drink is logged and ends when the user's estimated BAC has returned to zero **and** no drinks have been logged for at least two hours. When a session ends it is automatically committed to history and the active log is cleared — the user never needs to manually close a session.

## Roadmap

### v0.1.0 (current)

Anonymous sessions, drink logging, beer catalogue, BAC estimates, offline-first sync, opt-in accounts, BAC graph, drinking history dashboard, OTP sign-in, Cloudflare Turnstile bot protection

### v0.2.0

Drinking history stats (average consumption, favourite beers, trends)

### v1.0.0

Optional AI session tips, UI polish based on user feedback

## Technology stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4                 |
| Backend  | Go, AWS Lambda (provided.al2023, ARM64)                     |
| Database | DynamoDB single-table design                                |
| Auth     | Supabase (Google SSO + email OTP)                           |
| Security | Cloudflare Turnstile (invisible CAPTCHA on magic link send) |
| Infra    | AWS CDK, CloudFront, S3                                     |

## Prerequisites

You will need accounts / credentials for:

- **AWS** — with a profile configured locally (`aws configure`)
- **Supabase** — project with Google OAuth and magic link/OTP enabled; OTP length set to 6
- **Cloudflare** — Turnstile widget (invisible mode) with site key and secret key
- A domain name with an ACM certificate in `us-east-1` (CloudFront requires it there)

## First-time setup

### 1. Clone and install tools

```bash
# Install mise (version manager)
paru -S mise
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
source ~/.bashrc

git clone https://github.com/tristanbatchler/itsbeeroclock.git
cd itsbeeroclock

mise use node@24.14.1
mise use golang@1.25.8
mise install
```

### 2. Create your .env file

```bash
cp .env.example .env
```

Fill in every value. See `.env.example` for descriptions. Leave `TABLE_NAME` and `S3_BUCKET` blank for now — you'll get them after the first deploy.

### 3. Install dependencies

```bash
cd frontend && npm install && cd ..
cd backend && go mod tidy && cd ..
cd infra && npm install && cd cdk && npm install && cd ../..
```

### 4. First deploy (gets you the bucket names and table name)

```bash
cd infra/cdk
npx cdk bootstrap   # only needed once per AWS account/region
npx cdk deploy
```

The deploy will print outputs like:

```
BeerOClockStack.TableName = BeerOClockStack-BeerTable...
BeerOClockStack.UploadsBucketName = beeroclockstack-uploadsbucket...
BeerOClockStack.CloudFrontUrl = https://xxxx.cloudfront.net
```

Copy `TableName` → `TABLE_NAME` in your `.env`.
Copy `UploadsBucketName` → `S3_BUCKET` in your `.env`.

### 5. Run locally

Terminal 1 — backend:

```bash
cd backend
go run cmd/local/main.go
```

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> **Turnstile in local dev:** if `CF_TURNSTILE_SITE_KEY` is not set, the Turnstile widget auto-passes silently. For the backend to accept the token, set `CF_TURNSTILE_SECRET_KEY` to Cloudflare's test secret key: `1x0000000000000000000000000000000AA`.

### 6. Subsequent deploys

```bash
npm run deploy
```

This builds the frontend (including pre-rendering KaTeX formulas and generating image thumbnails), builds the Go Lambda binary, and runs `cdk deploy`. CloudFront is automatically invalidated.

## Recommended VS Code extensions

```bash
code --install-extension golang.go
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension amazonwebservices.aws-toolkit-vscode
```
