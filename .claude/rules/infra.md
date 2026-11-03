---
paths:
  - "infra/**/*"
---

# Infrastructure rules

These two settings prevent failures that are hard to diagnose, so don't change them:

- The `/api/*` CloudFront behaviour needs `originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER`. Without it, CloudFront strips the `Authorization` header and authenticated requests return 401, with nothing useful in the Go logs.
- `errorResponses` maps S3 403/404 to `index.html` with `responseHttpStatus: 200`. With 404, the SPA still works for real users, but monitors and crawlers report the site as down.

Bucket lifecycles differ. `FrontendBucket` is replaced on every deploy, so never store anything there by hand. `UploadsBucket` is `RETAIN` and holds user uploads.
