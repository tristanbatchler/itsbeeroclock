package api

import (
	"slices"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func TestCustomBeerThumbKeys(t *testing.T) {
	item := func(sk string) map[string]types.AttributeValue {
		return map[string]types.AttributeValue{"SK": &types.AttributeValueMemberS{Value: sk}}
	}
	items := []map[string]types.AttributeValue{
		item(KeyProfile),
		item(DrinkSK(1, "d1")),
		item(HistorySK(1)),
		item(CustomBeerSK("beer-1")),
		item(CustomBeerSK("beer-2")),
		{"SK": &types.AttributeValueMemberN{Value: "1"}},
		{},
	}

	got := customBeerThumbKeys("alice", items)
	want := []string{"custom/alice/beer-1/thumb.webp", "custom/alice/beer-2/thumb.webp"}
	if !slices.Equal(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}

	if got := customBeerThumbKeys("alice", []map[string]types.AttributeValue{item(KeyProfile)}); len(got) != 0 {
		t.Errorf("got %v for a user with no custom beers", got)
	}
}
