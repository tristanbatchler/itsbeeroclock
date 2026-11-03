package api

import (
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

// LocalDynamoDBEndpoint returns the DynamoDB Local URL, or "" when using real AWS.
func LocalDynamoDBEndpoint() string {
	return utils.GetVar("DYNAMODB_ENDPOINT")
}

// RequireLocalDynamoDB stops local tools from reaching real data by accident.
// allowProd is the tool's explicit -prod flag.
func RequireLocalDynamoDB(allowProd bool) {
	endpoint := LocalDynamoDBEndpoint()
	if endpoint == "" && !allowProd {
		log.Fatal("DYNAMODB_ENDPOINT is not set, so this would use the real DynamoDB table. Set it to use DynamoDB Local, or pass -prod to use real data")
	}
	if endpoint != "" && allowProd {
		log.Fatal("-prod was passed, but DYNAMODB_ENDPOINT is set, so this would use DynamoDB Local. Empty it in the shell, and set TABLE_NAME to the real table: DYNAMODB_ENDPOINT= TABLE_NAME=<table> ... -prod")
	}
}

func TableName() *string {
	tableName := aws.String(utils.GetVar("TABLE_NAME"))
	if tableName == nil || *tableName == "" {
		log.Fatal("TABLE_NAME environment variable is required")
	}
	return tableName
}
