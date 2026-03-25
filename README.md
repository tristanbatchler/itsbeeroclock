# Beer O'clock

[https://itsbeeroclock.au](https://itsbeeroclock.au)

Beer O'clock lets Queenslanders confidently track their nights out by providing a stupid simple interface to log pots, pints, and schooners (or standard cans/bottles). If the drink can't be logged in under 5 seconds, it's too hard.

So many alcohol trackers appeal to the global market, meaning it appeals to everybody and nobody at the same time. 

Everything about Beer O'clock is for Queenslanders who just want a no-BS way to see what they've had to drink in a night.


## Core principles

- Log the first drink in under 5 seconds.  
- Can be easily used even if intoxicated. 
- Everything is opt-in by default.

## Roadmap

### v0.1.0
- Anonymous session by default
- Quick-add buttons for standard Queensland drink sizes
- Pre-loaded catalogue of popular Queensland beers
- Opt-in account creation with Google/Apple SSO and magic link
- Session data migrates automatically from local storage to user profile on sign-in
- Real-time BAC estimate with "Can I drive?" banner
- "When can I drive?" time projection
- BAC graph for the current session
- Light/dark/system theme support
- Searchable beer catalogue with recent list and favourites

### v0.2.0
- User-uploaded beers with optional photo
- Drinking history dashboard (average consumption, favourite beers, stats)

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
- API Gateway with Cognito JWT authoriser

### Database
- DynamoDB single-table design (for authenticated users)

### Authentication
- Cognito User Pool  
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
paru -S asdf-vm
git clone https://github.com/tristanbatchler/itsbeeroclock.git

cd itsbeeroclock/backend
asdf plugin add golang https://github.com/asdf-community/asdf-golang.git
asdf install golang 1.25.8
echo -e "golang 1.25.8" > .tool-versions



cd ../frontend
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf install nodejs 24.14.1
echo -e "nodejs 24.14.1" > .tool-versions
npm install
```

### For deployment
```bash
paru -S aws-cli-v2
npm install -g aws-cdk
aws configure
```