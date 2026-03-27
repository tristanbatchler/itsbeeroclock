package utils

import (
	"os"
	"path/filepath"
	"runtime"

	"github.com/joho/godotenv"
)

func getProjectParent() string {
	// This is only valid in the local development environment, not going to work in production
	_, b, _, _ := runtime.Caller(0)
	currentDir := filepath.Dir(b)
	projectParent := filepath.Join(currentDir, "..", "..", "..")
	return projectParent
}

func GetVar(key string) string {
	val, found := os.LookupEnv(key)
	if !found {
		// Try loading .env file from the project root
		projectParent := getProjectParent()
		if projectParent != "" {
			err := godotenv.Load(filepath.Join(projectParent, ".env"))
			if err == nil {
				val, _ = os.LookupEnv(key)
			}
		}
	}
	return val
}
