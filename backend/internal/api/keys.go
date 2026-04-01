package api

import (
	"fmt"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

const (
	PrefixUser       = "USER#"
	PrefixDrink      = "DRINK#"
	PrefixCustomBeer = "CUSTOMBEER#"
	PrefixHistory    = "HISTORY#"
	KeyProfile       = "PROFILE"
	KeyCatalog       = "CATALOGUE"

	// IndexDrinksByTime is the GSI name for time-range queries on a user's drinks.
	// Partition key: PK (USER#{userID}), Sort key: Timestamp (epoch ms, number).
	IndexDrinksByTime = "GSI2"
)

func UserPK(userID string) string {
	return PrefixUser + userID
}

func DrinkSK(timestamp int64, drinkID string) string {
	return fmt.Sprintf("%s%d#%s", PrefixDrink, timestamp, drinkID)
}

func CustomBeerSK(beerID string) string {
	return PrefixCustomBeer + beerID
}

func HistorySK(startTimestamp int64) string {
	return fmt.Sprintf("%s%013d", PrefixHistory, startTimestamp)
}

// DrinkTimeRangeQuery returns the KeyConditionExpression and ExpressionAttributeValues
// needed to query GSI2 for a user's drinks within [fromMs, toMs] (epoch milliseconds).
// Timestamp is a reserved word in DynamoDB, so callers must also pass
// ExpressionAttributeNames: map[string]string{"#ts": "Timestamp"}.
//
// Usage:
//
//	expr, vals := DrinkTimeRangeQuery(userID, from, to)
//	dbClient.Query(ctx, &dynamodb.QueryInput{
//	    TableName:                 TableName(),
//	    IndexName:                 aws.String(IndexDrinksByTime),
//	    KeyConditionExpression:    aws.String(expr),
//	    ExpressionAttributeNames:  map[string]string{"#ts": "Timestamp"},
//	    ExpressionAttributeValues: vals,
//	})
func DrinkTimeRangeQuery(userID string, fromMs, toMs int64) (expression string, values map[string]types.AttributeValue) {
	return "PK = :pk AND #ts BETWEEN :from AND :to",
		map[string]types.AttributeValue{
			":pk":   &types.AttributeValueMemberS{Value: UserPK(userID)},
			":from": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", fromMs)},
			":to":   &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", toMs)},
		}
}
