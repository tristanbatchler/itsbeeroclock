package main

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

type CatalogueItem struct {
	PK      string  `dynamodbav:"PK"`     // CATALOGUE
	SK      string  `dynamodbav:"SK"`     // BEER#{id}
	GSI1PK  string  `dynamodbav:"GSI1PK"` // CATALOGUE
	GSI1SK  string  `dynamodbav:"GSI1SK"` // {brewery}#{name}
	Name    string  `dynamodbav:"Name"`
	Brewery string  `dynamodbav:"Brewery"`
	ABV     float64 `dynamodbav:"ABV"`
}

func main() {
	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion("ap-southeast-2"))
	if err != nil {
		log.Fatal(err)
	}
	db := dynamodb.NewFromConfig(cfg)
	tableName := utils.GetVar("TABLE_NAME")

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
	for _, b := range beers {
		item := CatalogueItem{
			PK:      "CATALOGUE",
			SK:      fmt.Sprintf("BEER#%s", b.ID),
			GSI1PK:  "CATALOGUE",
			GSI1SK:  fmt.Sprintf("%s#%s", b.Brewery, b.Name),
			Name:    b.Name,
			Brewery: b.Brewery,
			ABV:     b.ABV,
		}

		av, _ := attributevalue.MarshalMap(item)
		_, err := db.PutItem(context.Background(), &dynamodb.PutItemInput{
			TableName: aws.String(tableName),
			Item:      av,
		})
		if err != nil {
			log.Printf("Error inserting %s: %v", b.Name, err)
		}
	}
	log.Println("Seed complete!")
}
