package models

type DrinkRecord struct {
	PK        string `dynamodbav:"PK"` // USER#{userID}
	SK        string `dynamodbav:"SK"` // DRINK#{timestamp}
	BeerID    string `dynamodbav:"BeerID"`
	Size      string `dynamodbav:"Size"`
	Timestamp int64  `dynamodbav:"Timestamp"`
}
