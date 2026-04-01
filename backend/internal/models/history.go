package models

type HistoryRecord struct {
	PK              string  `dynamodbav:"PK"`
	SK              string  `dynamodbav:"SK"`
	StartTimestamp  int64   `dynamodbav:"StartTimestamp" json:"startTimestamp"`
	EndTimestamp    int64   `dynamodbav:"EndTimestamp" json:"endTimestamp"`
	DurationMinutes float64 `dynamodbav:"DurationMinutes" json:"durationMinutes"`
	TotalStdDrinks  float64 `dynamodbav:"TotalStdDrinks" json:"totalStandardDrinks"`
	PeakBAC         float64 `dynamodbav:"PeakBAC" json:"peakBAC"`
	Drinks          string  `dynamodbav:"Drinks" json:"drinks"` // JSON-encoded []DrinkRecord
}
