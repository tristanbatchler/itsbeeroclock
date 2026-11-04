package models

type Beer struct {
	ID       string  `json:"id" dynamodbav:"ID"`
	Name     string  `json:"name" dynamodbav:"Name"`
	Brewery  string  `json:"brewery" dynamodbav:"Brewery"`
	ABV      float64 `json:"abv" dynamodbav:"ABV"`
	Image    string  `json:"image" dynamodbav:"Image"`
	IsCustom bool    `json:"isCustom" dynamodbav:"IsCustom"`
	// Rank orders the catalogue: higher shows first, so everyday beers are one tap away.
	Rank int `json:"-" dynamodbav:"Rank"`
}
