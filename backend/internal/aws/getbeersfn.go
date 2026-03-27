package aws

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var GetBeersHandler ApiProxyGatewayHandler = func(ctx context.Context, apr events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// TODO: Query DynamoDB for beer catalogue
	beers := []models.Beer{
		{ID: "xxxx-gold", Name: "XXXX Gold", Brewery: "XXXX", ABV: 3.5},
		{ID: "xxxx-bitter", Name: "XXXX Bitter", Brewery: "XXXX", ABV: 4.6},
		{ID: "great-northern-orig", Name: "Great Northern Original", Brewery: "Great Northern", ABV: 3.5},
		{ID: "great-northern-sc", Name: "Great Northern Super Crisp", Brewery: "Great Northern", ABV: 4.2},
		{ID: "vb", Name: "Victoria Bitter", Brewery: "CUB", ABV: 4.9},
		{ID: "carlton-dry", Name: "Carlton Dry", Brewery: "CUB", ABV: 4.5},
		{ID: "stone-wood-pacific", Name: "Pacific Ale", Brewery: "Stone & Wood", ABV: 4.4},
		{ID: "balter-xpa", Name: "XPA", Brewery: "Balter", ABV: 5.0},
		{ID: "burleigh-bighead", Name: "Bighead", Brewery: "Burleigh Brewing", ABV: 3.5},
		{ID: "coopers-pale", Name: "Pale Ale", Brewery: "Coopers", ABV: 4.5},
		{ID: "demo-beer", Name: "Demo Beer", Brewery: "Demo Brewery", ABV: 4.8},
	}

	body, _ := json.Marshal(beers)
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       string(body),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}
