package models

type UserProfile struct {
	Weight           float64  `json:"weight" dynamodbav:"Weight"`
	Height           float64  `json:"height" dynamodbav:"Height"`
	Age              int      `json:"age" dynamodbav:"Age"`
	Sex              string   `json:"sex" dynamodbav:"Sex"`
	OptInHistory     bool     `json:"optInHistory" dynamodbav:"OptInHistory"`
	FavouriteBeerIDs []string `json:"favouriteBeerIds" dynamodbav:"FavouriteBeerIds"`
}
