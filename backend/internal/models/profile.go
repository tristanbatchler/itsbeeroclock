package models

type UserProfile struct {
	Weight           float64  `json:"weight" dynamodbav:"Weight"`
	Height           float64  `json:"height" dynamodbav:"Height"`
	Age              int      `json:"age" dynamodbav:"Age"`
	Sex              string   `json:"sex" dynamodbav:"Sex"`
	OptInHistory     bool     `json:"optInHistory" dynamodbav:"OptInHistory"`
	FavouriteBeerIDs []string `json:"favouriteBeerIds" dynamodbav:"FavouriteBeerIds"`
	// ProfileSetup is false until the user explicitly saves their profile.
	// The frontend uses this to distinguish "ghost" accounts from real ones.
	ProfileSetup bool `json:"profileSetup" dynamodbav:"ProfileSetup"`
}
