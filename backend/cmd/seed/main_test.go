package main

import (
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func row(pk, sk, beerID string) map[string]types.AttributeValue {
	item := map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: pk},
		"SK": &types.AttributeValueMemberS{Value: sk},
	}
	if beerID != "" {
		item["BeerID"] = &types.AttributeValueMemberS{Value: beerID}
	}
	return item
}

func TestStaleRowsOnlyTouchesCatalogueRowsMissingFromBeers(t *testing.T) {
	items := []map[string]types.AttributeValue{
		row("CATALOGUE", "BEER#kept", "kept"),
		row("CATALOGUE", "BEER#gone", "gone"),
		row("USER#1", "DRINK#1", "gone"),
		row("USER#1", "DRINK#2", "kept"),
		row("USER#1", "PROFILE", ""),
	}

	stale, affected := staleRows(items, []seedBeer{{ID: "kept"}})

	if len(stale) != 1 || stale[0]["SK"].(*types.AttributeValueMemberS).Value != "BEER#gone" {
		t.Fatalf("stale = %v, want only BEER#gone", stale)
	}
	if affected != 1 {
		t.Fatalf("affected drinks = %d, want 1", affected)
	}
}
