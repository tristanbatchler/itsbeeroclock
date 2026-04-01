package api

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

// GetBeersBatchHandler resolves a set of catalogue beer IDs in a single
// BatchGetItem call. Used by the frontend to fetch only the beers referenced
// in a user's drink log, rather than paginating the entire catalogue.
//
// GET /api/beers/batch?ids=id1,id2,...  (max 100 IDs per request)
var GetBeersBatchHandler ApiProxyGatewayHandler = func(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	raw := req.QueryStringParameters["ids"]
	if raw == "" {
		return JSONResponse(http.StatusOK, []models.Beer{})
	}

	ids := strings.Split(raw, ",")
	// DynamoDB BatchGetItem hard limit is 100 items.
	if len(ids) > 100 {
		ids = ids[:100]
	}

	keys := make([]map[string]types.AttributeValue, 0, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		keys = append(keys, map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: KeyCatalog},
			"SK": &types.AttributeValueMemberS{Value: "BEER#" + id},
		})
	}

	if len(keys) == 0 {
		return JSONResponse(http.StatusOK, []models.Beer{})
	}

	tableName := *TableName()
	out, err := dbClient.BatchGetItem(ctx, &dynamodb.BatchGetItemInput{
		RequestItems: map[string]types.KeysAndAttributes{
			tableName: {Keys: keys},
		},
	})
	if err != nil {
		log.Printf("GetBeersBatchHandler: BatchGetItem failed: %v", err)
		return ErrorResponse(http.StatusInternalServerError, "failed to fetch beers")
	}

	beers := make([]models.Beer, 0, len(out.Responses[tableName]))
	for _, item := range out.Responses[tableName] {
		var beer models.Beer
		if err := attributevalue.UnmarshalMap(item, &beer); err != nil {
			log.Printf("GetBeersBatchHandler: failed to unmarshal beer: %v", err)
			continue
		}
		// Derive ID from SK ("BEER#{id}") since the ID field may not be stored
		if skVal, ok := item["SK"].(*types.AttributeValueMemberS); ok {
			beer.ID = strings.TrimPrefix(skVal.Value, "BEER#")
		}
		beers = append(beers, beer)
	}

	return JSONResponse(http.StatusOK, beers)
}
