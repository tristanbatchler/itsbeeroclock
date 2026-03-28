package models

type DrinkRecord struct {
	ID        string `dynamodbav:"ID" json:"id"`
	PK        string `dynamodbav:"PK" json:"-"` // USER#{userID}
	SK        string `dynamodbav:"SK" json:"-"` // DRINK#{timestamp}
	BeerID    string `dynamodbav:"BeerID" json:"beerId"`
	Size      string `dynamodbav:"Size" json:"size"`
	Timestamp int64  `dynamodbav:"Timestamp" json:"timestamp"`
}
