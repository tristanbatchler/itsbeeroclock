# Beer O'Clock — Infrastructure (CDK)

This directory contains the AWS CDK stack that provisions all cloud resources for Beer O'Clock.

## What gets deployed

| Resource         | Purpose                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `FrontendBucket` | S3 bucket for the compiled React app (static assets, beer images)                                                  |
| `UploadsBucket`  | S3 bucket for user-uploaded custom beer thumbnails. Uses `RETAIN` removal policy so uploads survive stack updates. |
| `ApiFn`          | Go Lambda function (ARM64, provided.al2023)                                                                        |
| `BeerTable`      | DynamoDB single-table with GSI1 (catalogue scan) and GSI2 (drink time-range queries)                               |
| `BeerOClockApi`  | API Gateway (Lambda proxy)                                                                                         |
| `Distribution`   | CloudFront distribution serving the frontend, `/api/*` (API Gateway), and `/custom/*` (uploads bucket)             |

## Environment variables injected into the Lambda at deploy time

The CDK automatically sets these on the Lambda — you do **not** need to manage them manually in production:

- `TABLE_NAME` — DynamoDB table name
- `S3_BUCKET` — uploads bucket name
- `APP_DOMAIN_NAME` — your domain (used to construct CloudFront URLs for uploaded images)
- `SUPABASE_URL` — read from your local environment at deploy time

## First deploy

```bash
# From the repo root
cd infra/cdk
npx cdk bootstrap   # once per AWS account/region
npx cdk deploy
```

After deploying, note the stack outputs:

```
BeerOClockStack.TableName        → copy to TABLE_NAME in .env
BeerOClockStack.UploadsBucketName → copy to S3_BUCKET in .env
BeerOClockStack.CloudFrontUrl    → your CloudFront URL (before custom domain is active)
BeerOClockStack.ApiUrl           → API Gateway URL (for debugging)
```

These values are only needed in `.env` for **local development**. In production the Lambda gets them automatically.

## Subsequent deploys

```bash
# Build the Go binary first (from repo root)
cd backend && ./build_lambda.sh && cd ..

# Then deploy
cd infra/cdk && npx cdk deploy
```

The `BucketDeployment` construct will also sync the latest frontend build to S3 and invalidate CloudFront.

## Useful commands

```bash
npx cdk diff     # compare local stack with what's deployed
npx cdk synth    # emit the CloudFormation template without deploying
npx cdk destroy  # tear down (UploadsBucket is RETAIN — won't be deleted)
```

## Notes

- The ACM certificate ARN is hardcoded in `cdk-stack.ts`. It must be in `us-east-1` (CloudFront requirement). Update it if you're deploying to a different account.
- The `FrontendBucket` uses `DESTROY` + `autoDeleteObjects` — it is fully replaced on every deploy. Never store anything important there manually.
- The `UploadsBucket` uses `RETAIN` — it will not be deleted even if you run `cdk destroy`. This protects user-uploaded images.
