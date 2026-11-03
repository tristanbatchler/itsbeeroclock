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

Anonymous sessions, drink logging, beer catalogue, BAC estimates, offline-first sync, opt-in accounts, BAC graph, drinking history dashboard, Google sign-in

### v0.2.0

Drinking history stats (average consumption, favourite beers, trends)

### v1.0.0

Optional AI session tips, UI polish based on user feedback

## Technology stack

| Layer    | Tech                                                 |
| -------- | ---------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4          |
| Backend  | Go, AWS Lambda (provided.al2023, ARM64)              |
| Database | DynamoDB single-table design                         |
| Auth     | Google sign-in, with the backend's own session cookie |
| Infra    | AWS CDK, CloudFront, S3                              |

## Prerequisites

You will need accounts / credentials for:

- **AWS** — with a profile configured locally (`aws configure`)
- **Google Cloud** — an OAuth web client requesting only `openid`, with redirect URIs `https://<your domain>/api/auth/google/callback` and `http://localhost:5173/api/auth/google/callback`
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

Fill in every value. Leave `TABLE_NAME` and `S3_BUCKET` blank for now — you'll get them after the first deploy.

| Variable                   | Used by         | Purpose                                            |
| -------------------------- | --------------- | -------------------------------------------------- |
| `GOOGLE_CLIENT_ID`         | Backend, CDK    | Google OAuth client ID                             |
| `GOOGLE_CLIENT_SECRET`     | Backend, CDK    | Google OAuth client secret                         |
| `SESSION_SECRET`           | Backend, CDK    | `openssl rand -base64 32`, different for production |
| `APP_ORIGIN`               | Backend (local) | `http://localhost:5173`. CDK sets it in production |
| `TABLE_NAME`               | Backend, CDK    | DynamoDB table name                                |
| `S3_BUCKET`                | Backend, CDK    | Uploads bucket name                                |
| `APP_DOMAIN_NAME`          | All             | Domain (e.g. itsbeeroclock.au)                     |
| `APP_SUPPORT_EMAIL`        | Frontend        | Support email shown in UI                          |
| `CORS_ORIGIN`              | Backend (local) | Allowed CORS origin for local dev                  |
| `DYNAMODB_ENDPOINT`        | Backend (local) | DynamoDB Local URL. Never set this in `.env.prod`  |

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

Copy `TableName` → `TABLE_NAME` in your `.env.prod`.
Copy `UploadsBucketName` → `S3_BUCKET` in your `.env.prod`.

### 5. Run locally

Local dev uses DynamoDB Local, so it can't touch production data. Keep your production values in `.env.prod`, then set these in `.env`. CDK refuses to run if it would pick up these local settings.

```
DYNAMODB_ENDPOINT=http://localhost:8000
TABLE_NAME=beeroclock-local
```

Start the database, then create and fill the table. Data persists across restarts, and `docker compose down -v` resets it.

```bash
docker compose up -d
cd backend
go run ./cmd/seed
```

Custom beer thumbnails stay in the local table instead of going to S3.

The backend and seed script refuse to run without `DYNAMODB_ENDPOINT`. To use the real table on purpose, pass `-prod` and override your local settings in the shell, for example to update the production catalogue:

```bash
DYNAMODB_ENDPOINT= TABLE_NAME=<real table name> go run ./cmd/seed -prod
```

Terminal 1 — backend:

```bash
cd backend
go run ./cmd/local
```

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To sign in locally without Google, open [http://localhost:5173/api/dev/login?user=alice](http://localhost:5173/api/dev/login?user=alice). Change `user` to act as a different person. This signs in as `dev-alice`, and only `cmd/local` offers it. Real Google sign-in also works on `localhost`.

### AWS login troubleshooting (real DynamoDB access)

This only applies when using `-prod`. If backend logs show errors like:

`create oauth2 token: login session has expired, please reauthenticate`

then your AWS CLI login session has expired. This is an auth/session issue, not a DynamoDB schema issue.

Use:

```bash
aws configure list-profiles
aws sts get-caller-identity --profile default
```

If identity fails with session-expired/login errors, reauthenticate:

```bash
aws login --profile default
```

If `aws login` returns `INVALID_REQUEST` (expired or malformed authorization grant), clear the login cache and retry:

```bash
rm -rf ~/.aws/login/cache/*
aws login --profile default
```

Then verify again:

```bash
aws sts get-caller-identity --profile default
```

If you are using SSH/remote shell and browser callback cannot complete, use:

```bash
aws login --profile default --remote
```

### 6. Subsequent deploys

```bash
npm run deploy
```

This builds the frontend (including pre-rendering KaTeX formulas and generating image thumbnails), builds the Go Lambda binary, and runs `cdk deploy`. CloudFront is automatically invalidated.

## CI/CD

Pushes to `master` automatically deploy via GitHub Actions (`.github/workflows/deploy.yml`).

The workflow authenticates to AWS using OIDC (no long-lived secrets). The IAM role is provisioned by `GitHubRoleStack` — deploy it once locally:

```bash
cd infra/cdk && npx cdk deploy GitHubRoleStack
```

Then add the following secrets to your GitHub repo (Settings → Secrets and variables → Actions):

| Secret                     | Value                               |
| -------------------------- | ----------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`      | RoleArn output from GitHubRoleStack |
| `GOOGLE_CLIENT_ID`         | from `.env.prod`                    |
| `GOOGLE_CLIENT_SECRET`     | from `.env.prod`                    |
| `SESSION_SECRET`           | from `.env.prod`                    |
| `TABLE_NAME`               | from `.env.prod`                    |
| `APP_DOMAIN_NAME`          | `itsbeeroclock.au`                  |
| `APP_SUPPORT_EMAIL`        | from `.env.prod`                    |
| `CORS_ORIGIN`              | `https://itsbeeroclock.au`          |
| `S3_BUCKET`                | from `.env.prod`                    |

## Google sign-in cutover

This is a one-off. Run the wipe after sign-in works in production, with an admin login, because the read-only agent profile can't read or delete items. Without `-execute` it's a dry run that only prints counts:

```bash
cd backend
DYNAMODB_ENDPOINT= TABLE_NAME=<real table name> S3_BUCKET=<real bucket name> go run ./cmd/wipeusers -prod
```

Check the counts, then add `-execute` and type the table name when asked. It deletes every `USER#` item and everything under `custom/`, and keeps the `CATALOGUE` items. Restoring afterwards needs point-in-time recovery, which restores to a new table.

## Recommended VS Code extensions

```bash
code --install-extension golang.go
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension amazonwebservices.aws-toolkit-vscode
```
