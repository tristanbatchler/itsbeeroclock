# Beer O'Clock

[https://itsbeeroclock.au](https://itsbeeroclock.au)

Beer O'Clock lets Queenslanders confidently track their nights out with a stupid-simple interface for logging pots, pints, and schooners. If a drink can't be logged in under 5 seconds, it's too hard.

## Core principles

- Log the first drink in under 5 seconds.
- Usable even while intoxicated.
- Everything opt-in by default.

## Session lifecycle

A session begins when the first drink is logged and ends when the user's estimated BAC has returned to zero **and** no drinks have been logged for at least two hours. When a session ends it is automatically committed to history and the active log is cleared — the user never needs to manually close a session.

## Roadmap

### v0.1.0 (current)

Anonymous sessions, drink logging, beer catalogue, BAC estimates, offline-first sync, opt-in accounts, BAC graph

### v0.2.0

Drinking history dashboard (average consumption, favourite beers, stats)

### v1.0.0

Optional AI session tips, UI polish based on user feedback

## Technology stack

| Layer    | Tech                                        |
| -------- | ------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend  | Go, AWS Lambda (provided.al2023, ARM64)     |
| Database | DynamoDB single-table design                |
| Auth     | Supabase (Google SSO + magic link)          |
| Infra    | AWS CDK, CloudFront, S3, SES                |

## Prerequisites

You will need accounts / credentials for:

- **AWS** — with a profile configured locally (`aws configure`)
- **Supabase** — project with Google OAuth and magic link enabled
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

Fill in every value. See `.env.example` for descriptions. Leave `TABLE_NAME`, `S3_BUCKET`, and `UPLOADS_BUCKET` blank for now — you'll get them after the first deploy.

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

### 6. Subsequent deploys

```bash
npm run deploy
```

## Recommended VS Code extensions

```bash
code --install-extension golang.go
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension amazonwebservices.aws-toolkit-vscode
```
