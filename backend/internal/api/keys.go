package api

import "fmt"

const (
	PrefixUser  = "USER#"
	PrefixDrink = "DRINK#"
	KeyProfile  = "PROFILE"
	KeyCatalog  = "CATALOGUE"
)

func UserPK(userID string) string {
	return PrefixUser + userID
}

func DrinkSK(timestamp int64, drinkID string) string {
	return fmt.Sprintf("%s%d#%s", PrefixDrink, timestamp, drinkID)
}
