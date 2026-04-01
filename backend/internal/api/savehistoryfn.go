package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/models"
)

var SaveHistoryHandler AuthenticatedApiProxyGatewayHandler = func(
	ctx context.Context,
	authCtx *AuthContext,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {

	log.Printf("SaveHistory by user: %s (%s)", authCtx.UserID, authCtx.Email)

	var body struct {
		StartTimestamp  int64   `json:"startTimestamp"`
		EndTimestamp    int64   `json:"endTimestamp"`
		DurationMinutes float64 `json:"durationMinutes"`
		TotalStdDrinks  float64 `json:"totalStandardDrinks"`
		PeakBAC         float64 `json:"peakBAC"`
		Drinks          string  `json:"drinks"`
	}

	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		return ErrorResponse(http.StatusBadRequest, "invalid request body")
	}

	if body.StartTimestamp <= 0 {
		return ErrorResponse(http.StatusBadRequest, "startTimestamp is required and must be greater than zero")
	}

	record := models.HistoryRecord{
		PK:              UserPK(authCtx.UserID),
		SK:              HistorySK(body.StartTimestamp),
		StartTimestamp:  body.StartTimestamp,
		EndTimestamp:    body.EndTimestamp,
		DurationMinutes: body.DurationMinutes,
		TotalStdDrinks:  body.TotalStdDrinks,
		PeakBAC:         body.PeakBAC,
		Drinks:          body.Drinks,
	}

	av, err := attributevalue.MarshalMap(record)
	if err != nil {
		log.Printf("SaveHistory: failed to marshal record: %v", err)
		return ErrorResponse(http.StatusInternalServerError, "failed to marshal history record")
	}

	_, err = dbClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: TableName(),
		Item:      av,
	})
	if err != nil {
		log.Printf("SaveHistory: failed to put item: %v", err)
		return ErrorResponse(http.StatusInternalServerError, "failed to save history record")
	}

	return JSONResponse(http.StatusCreated, AppResponse{Message: "History saved successfully!"})
}
