package api

import (
	"context"
	"log"
	"strconv"

	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"

	"github.com/aws/aws-lambda-go/events"
)

const maxBeersPerPage = 100

var GetBeersHandler ApiProxyGatewayHandler = func(ctx context.Context, apr events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	limit := 30
	if l := apr.QueryStringParameters["limit"]; l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = min(parsed, maxBeersPerPage)
		}
	}

	entries, err := loadCatalogue(ctx)
	if err != nil {
		log.Printf("Error querying beers: %v", err)
		return ErrorResponse(500, "failed to query beers")
	}

	return JSONResponse(200, beersPage(
		searchCatalogue(entries, apr.QueryStringParameters["search"]),
		apr.QueryStringParameters["lastKey"],
		limit,
	))
}

// beersPage slices one page out of matches. lastKey is the opaque cursor from the
// previous page: its offset into matches. An unreadable cursor starts from the top.
func beersPage(matches []catalogueEntry, lastKey string, limit int) map[string]interface{} {
	start, err := strconv.Atoi(lastKey)
	if err != nil || start < 0 {
		start = 0
	}
	start = min(start, len(matches))
	end := min(start+limit, len(matches))

	beers := make([]models.Beer, 0, end-start)
	for _, e := range matches[start:end] {
		beers = append(beers, e.beer)
	}

	response := map[string]interface{}{
		"beers":   beers,
		"hasMore": end < len(matches),
	}
	if end < len(matches) {
		response["lastKey"] = strconv.Itoa(end)
	}
	return response
}
