package models

type Beer struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Brewery string  `json:"brewery"`
	ABV     float64 `json:"abv"`
	Image   string  `json:"image"`
}
