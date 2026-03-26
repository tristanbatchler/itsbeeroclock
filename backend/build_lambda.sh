#!/bin/sh
set -e

printf "Building api Lambda...\n"
GOOS=linux GOARCH=arm64 go build -o "cmd/api/bootstrap" "./cmd/api"
zip -j "./deployment.zip" "cmd/api/bootstrap"
rm -f "cmd/api/bootstrap"
printf "  -> ./deployment.zip\n"

echo "All Lambdas built."
exit 0