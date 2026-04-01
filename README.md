# Beer O'Clock

[https://itsbeeroclock.au](https://itsbeeroclock.au)

Beer O'Clock lets Queenslanders confidently track their nights out by providing a stupid simple interface to log pots, pints, and schooners (or standard cans/bottles). If the drink can't be logged in under 5 seconds, it's too hard.

So many alcohol trackers appeal to the global market, meaning it appeals to everybody and nobody at the same time.

Everything about Beer O'Clock is for Queenslanders who just want a no-BS way to see what they've had to drink in a night.

## Core principles

- Log the first drink in under 5 seconds.
- Can be easily used even if intoxicated.
- Everything is opt-in by default.

## Session lifecycle

A session begins when the first drink is logged and ends when the user's estimated BAC has returned to zero **and** no drinks have been logged for at least two hours. This avoids arbitrary time-based cutoffs (e.g. midnight rollovers or fixed idle windows) that would incorrectly split or merge sessions.

When a session ends, it is automatically committed to history and the active log is cleared. The user does not need to manually close a session.

## History

Completed sessions are available at `/history`. Each entry summarises the session with:

- Full drink log (name, size, time logged)
- Total duration (first drink to estimated sober time)
- Number of standard drinks
- Peak estimated BAC
- Additional aggregate stats (e.g. drink rate, session start/end times)

## Roadmap

### v0.1.0

- Anonymous session by default
- Quick-add buttons for standard Queensland drink sizes
- Pre-loaded catalogue of popular Queensland beers
- Opt-in account creation with Google/Apple SSO and magic link
- Session data migrates automatically from local storage to user profile on sign-in
- Real-time BAC estimate with "Can I drive?" banner
- "When can I drive?" time projection
- Light/dark/system theme support
- Searchable beer catalogue with recent list and favourites
- Ping the server in the background and mention when you're offline
- Update the times displayed throughout the app in semi-real-time (e.g. update every minute)

### v0.2.0

- User-uploaded beers with optional photo
- Drinking history dashboard (average consumption, favourite beers, stats)

### v0.3.0

- BAC graph for the current session
- Review previous sessions the next day with various questions, e.g. "how do you feel?", etc.
- "Not-so-fun facts", censored by default, and opt-in, in the history like "calories consumed", "money spent", etc.

### v1.0.0

- One lightweight AI-generated tip per session (optional).
- Polish UI/UX based on user feedback and testing.

## Technology stack

### Frontend

- React, TypeScript, Vite, Tailwind CSS
- IndexedDB, localStorage
- AWS Amplify for authentication UI flows

### Backend

- Go Lambda functions
- API Gateway with Supabase JWT authoriser

### Database

- DynamoDB single-table design (for authenticated users)

### Authentication

- Supabase to handle authentication
- Google and Apple SSO
- Magic link (SES)
- Anonymous sessions supported until explicit opt-in

### Infrastructure

- AWS CDK for all resources
- S3 & CloudFront for static hosting
- SES for email sending
- CloudWatch for logging and monitoring

The whole stack should be able to be deployed and redeployed with a single command.

## Quickstart for my dev environment

This is for my reference, but if you happen to be in a similar environment and want to get the project running, here are the I follow:

### For local dev

```bash
# 1. Install mise-en-place (version manager for Go, Node, etc.)
paru -S mise
echo 'eval "$(mise activate bash)"' >> ~/.bashrc

# 2. Clone and enter the project root
git clone https://github.com/tristanbatchler/itsbeeroclock.git
cd itsbeeroclock

# 3. Add plugins and install tools
mise use node@24.14.1
mise use golang@1.25.8
mise install

# 4. Install Frontend dependencies
cd frontend
npm install

# 5. Setup Backend
cd ../backend
go mod tidy

# 6. Recommended extensions
code --install-extension golang.go
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension amazonwebservices.aws-toolkit-vscode

# 7. Create the required .env file
cd ..
cp .env.example .env
code . # and fill in the required environment variables in the .env file
```

### For deployment

```bash
paru -S aws-cli-v2 zip
cd infra
npm install
aws login
cd cdk
npx cdk bootstrap
npx cdk deploy
```
