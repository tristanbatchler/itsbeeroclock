#!/bin/sh
set -e


mkdir -p lambda_deployments

for func in cmd/*; do
    func_name=$(basename "$func")
    printf "Building %s...\n" "$func_name"
    GOOS=linux GOARCH=arm64 go build -o "$func/bootstrap" "./$func"
    zip -j "lambda_deployments/$func_name.zip" "$func/bootstrap"
    rm -f "$func/bootstrap"
    printf "  -> lambda_deployments/%s.zip\n" "$func_name"
done

echo "All Lambdas built."
exit 0