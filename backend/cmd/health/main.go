package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/aws"
)

func main() {
	lambda.Start(aws.HealthHandler)
}
