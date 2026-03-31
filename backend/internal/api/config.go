package api

import (
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

func TableName() *string {
	tableName := aws.String(utils.GetVar("TABLE_NAME"))
	if tableName == nil || *tableName == "" {
		log.Fatal("TABLE_NAME environment variable is required")
	}
	return tableName
}
