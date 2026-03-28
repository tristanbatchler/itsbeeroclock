package models

type UserProfile struct {
	Weight           float64  `json:"weight" dynamodbav:"Weight"`
	Gender           string   `json:"gender" dynamodbav:"Gender"`
	OptInHistory     bool     `json:"optInHistory" dynamodbav:"OptInHistory"`
	FavouriteBeerIDs []string `json:"favouriteBeerIds" dynamodbav:"FavouriteBeerIds"`
}
