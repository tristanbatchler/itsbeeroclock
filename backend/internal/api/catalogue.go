package api

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

// catalogueTTL is how long a Lambda instance serves its copy before re-reading,
// so a re-seed reaches running instances without a deploy.
const catalogueTTL = time.Hour

type catalogueEntry struct {
	beer       models.Beer
	searchText string // normalised "name brewery"
}

var catalogueCache struct {
	sync.Mutex
	entries  []catalogueEntry
	loadedAt time.Time
}

// loadCatalogue returns the catalogue in display order. Searching it in memory
// means a search costs one read per hour rather than a read of the whole table.
func loadCatalogue(ctx context.Context) ([]catalogueEntry, error) {
	catalogueCache.Lock()
	defer catalogueCache.Unlock()

	if catalogueCache.entries != nil && time.Since(catalogueCache.loadedAt) < catalogueTTL {
		return catalogueCache.entries, nil
	}

	entries, err := queryCatalogue(ctx)
	if err != nil {
		if catalogueCache.entries != nil {
			return catalogueCache.entries, nil
		}
		return nil, err
	}
	catalogueCache.entries = entries
	catalogueCache.loadedAt = time.Now()
	return entries, nil
}

func queryCatalogue(ctx context.Context) ([]catalogueEntry, error) {
	entries := []catalogueEntry{}
	var lastKey map[string]types.AttributeValue
	for {
		out, err := dbClient.Query(ctx, &dynamodb.QueryInput{
			TableName:              TableName(),
			IndexName:              aws.String("GSI1"),
			KeyConditionExpression: aws.String("GSI1PK = :pk"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":pk": &types.AttributeValueMemberS{Value: KeyCatalog},
			},
			ExclusiveStartKey: lastKey,
		})
		if err != nil {
			return nil, err
		}
		for _, item := range out.Items {
			var beer models.Beer
			if err := attributevalue.UnmarshalMap(item, &beer); err != nil {
				continue
			}
			if skVal, ok := item["SK"].(*types.AttributeValueMemberS); ok {
				beer.ID = strings.TrimPrefix(skVal.Value, "BEER#")
			}
			entries = append(entries, newCatalogueEntry(beer))
		}
		lastKey = out.LastEvaluatedKey
		if len(lastKey) == 0 {
			break
		}
	}
	// GSI1 is sorted by brewery then name, and the stable sort keeps that within a rank.
	sort.SliceStable(entries, func(i, j int) bool {
		return entries[i].beer.Rank > entries[j].beer.Rank
	})
	return entries, nil
}

func newCatalogueEntry(beer models.Beer) catalogueEntry {
	return catalogueEntry{beer: beer, searchText: normaliseSearch(beer.Name + " " + beer.Brewery)}
}

// normaliseSearch makes "boags" find "Boag's" and "stone and wood" find "Stone & Wood".
func normaliseSearch(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch {
		case r == '\'' || r == '’' || r == '.':
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
		default:
			b.WriteRune(' ')
		}
	}
	words := strings.Fields(b.String())
	kept := words[:0]
	for _, w := range words {
		if w != "and" {
			kept = append(kept, w)
		}
	}
	return strings.Join(kept, " ")
}

// searchCatalogue keeps entries containing every search word, in any order.
// Entries whose text starts with the search come first, otherwise order is kept.
func searchCatalogue(entries []catalogueEntry, search string) []catalogueEntry {
	query := normaliseSearch(search)
	words := strings.Fields(query)
	if len(words) == 0 {
		return entries
	}
	var leading, rest []catalogueEntry
	for _, e := range entries {
		matched := true
		for _, w := range words {
			if !strings.Contains(e.searchText, w) {
				matched = false
				break
			}
		}
		if !matched {
			continue
		}
		if strings.HasPrefix(e.searchText, query) {
			leading = append(leading, e)
		} else {
			rest = append(rest, e)
		}
	}
	return append(leading, rest...)
}
