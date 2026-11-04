package api

import (
	"testing"

	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

func catalogueOf(beers ...models.Beer) []catalogueEntry {
	entries := make([]catalogueEntry, 0, len(beers))
	for _, b := range beers {
		entries = append(entries, newCatalogueEntry(b))
	}
	return entries
}

func TestSearchCatalogue(t *testing.T) {
	entries := catalogueOf(
		models.Beer{ID: "pacific", Name: "Pacific Ale", Brewery: "Stone & Wood"},
		models.Beer{ID: "boags", Name: "Boag's Draught", Brewery: "J. Boag & Son"},
		models.Beer{ID: "4pines", Name: "Pacific Ale", Brewery: "4 Pines"},
		models.Beer{ID: "becks", Name: "Beck's", Brewery: "Brauerei Beck"},
	)
	tests := []struct {
		search string
		want   []string
	}{
		{"", []string{"pacific", "boags", "4pines", "becks"}},
		{"boags", []string{"boags"}},
		{"BECKS", []string{"becks"}},
		{"stone and wood", []string{"pacific"}},
		{"stone & wood pacific", []string{"pacific"}},
		{"wood pacific", []string{"pacific"}},
		{"pines", []string{"4pines"}},
		{"guinness", nil},
		{"   ", []string{"pacific", "boags", "4pines", "becks"}},
	}
	for _, tt := range tests {
		got := searchCatalogue(entries, tt.search)
		if len(got) != len(tt.want) {
			t.Errorf("search %q: got %d results, want %d", tt.search, len(got), len(tt.want))
			continue
		}
		for i, e := range got {
			if e.beer.ID != tt.want[i] {
				t.Errorf("search %q result %d = %s, want %s", tt.search, i, e.beer.ID, tt.want[i])
			}
		}
	}
}

func TestSearchCataloguePutsLeadingMatchesFirst(t *testing.T) {
	entries := catalogueOf(
		models.Beer{ID: "xxxx-gold", Name: "Gold", Brewery: "XXXX"},
		models.Beer{ID: "gold-ale", Name: "Gold Ale", Brewery: "Aether"},
	)
	got := searchCatalogue(entries, "gold")
	if len(got) != 2 || got[0].beer.ID != "xxxx-gold" {
		t.Fatalf("unexpected order: %+v", got)
	}
	got = searchCatalogue(entries, "gold ale")
	if len(got) != 1 || got[0].beer.ID != "gold-ale" {
		t.Fatalf("unexpected results: %+v", got)
	}
}

// Every beer must appear exactly once however the catalogue is paged. The previous
// handler read 50 items, returned 30 and resumed after the 50th, losing the other 20.
func TestBeersPageVisitsEveryBeerOnce(t *testing.T) {
	var beers []models.Beer
	for _, id := range []string{"a", "b", "c", "d", "e", "f", "g"} {
		beers = append(beers, models.Beer{ID: id})
	}
	entries := catalogueOf(beers...)

	seen := map[string]int{}
	cursor := ""
	for pages := 0; ; pages++ {
		if pages > len(beers) {
			t.Fatal("paging didn't terminate")
		}
		page := beersPage(entries, cursor, 3)
		for _, b := range page["beers"].([]models.Beer) {
			seen[b.ID]++
		}
		if !page["hasMore"].(bool) {
			if _, ok := page["lastKey"]; ok {
				t.Error("last page shouldn't carry a cursor")
			}
			break
		}
		cursor = page["lastKey"].(string)
	}
	for _, b := range beers {
		if seen[b.ID] != 1 {
			t.Errorf("beer %s seen %d times", b.ID, seen[b.ID])
		}
	}
}

func TestBeersPageBadCursors(t *testing.T) {
	entries := catalogueOf(models.Beer{ID: "a"}, models.Beer{ID: "b"})
	for _, cursor := range []string{"", "garbage", "-1", `{"PK":"CATALOGUE"}`} {
		if got := beersPage(entries, cursor, 1)["beers"].([]models.Beer); len(got) != 1 || got[0].ID != "a" {
			t.Errorf("cursor %q: got %+v, want first beer", cursor, got)
		}
	}
	page := beersPage(entries, "99", 1)
	if got := page["beers"].([]models.Beer); len(got) != 0 || page["hasMore"].(bool) {
		t.Errorf("past-the-end cursor: got %+v", page)
	}
}
