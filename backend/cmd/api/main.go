package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/api"
)

func main() {
	lambda.Start(api.Router)
}
