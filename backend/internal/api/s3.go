package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/tristanbatchler/itsbeeroclock/backend/internal/utils"
)

var s3Client *s3.Client

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("s3: failed to load AWS config: %v", err)
	}
	s3Client = s3.NewFromConfig(cfg)
}

// UploadThumbnail decodes a base64 WebP data URL and writes it to S3.
// Returns the public HTTPS URL of the stored object.
// key should be a full S3 object key, e.g. "custom/{userID}/{beerID}/thumb.webp".
func UploadThumbnail(ctx context.Context, base64DataURL string, key string) (string, error) {
	// Strip the data URL prefix ("data:image/webp;base64,")
	parts := strings.SplitN(base64DataURL, ",", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid base64 data URL")
	}

	imgBytes, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("base64 decode failed: %w", err)
	}

	bucket := utils.GetVar("S3_BUCKET")
	_, err = s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(bucket),
		Key:          aws.String(key),
		Body:         bytes.NewReader(imgBytes),
		ContentType:  aws.String("image/webp"),
		CacheControl: aws.String("public, max-age=31536000"),
	})
	if err != nil {
		return "", fmt.Errorf("S3 PutObject failed: %w", err)
	}

	region := utils.GetVar("AWS_REGION")
	if region == "" {
		region = "ap-southeast-2"
	}
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key)
	return url, nil
}
