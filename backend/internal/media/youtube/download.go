package youtube

import (
	"context"
	"fmt"
	"io"
	"media-downloader/internal/media/info"

	"github.com/wader/goutubedl"
)

func DownloadMedia(ctx context.Context, url string, sourceIdentifier string) (*info.Media, *info.Format, io.ReadCloser, error) {
	// Get YouTube media result
	result, cached := cache.Get(url)
	if !cached {
		var err error
		var newResult goutubedl.Result
		if newResult, err = goutubedl.New(ctx, url, goutubedl.Options{}); err != nil {
			return nil, nil, nil, fmt.Errorf("new youtubedl failed: %w", err)
		}
		result = &newResult
		cache.Set(url, result)
	}

	// Find format by identifier
	var format *goutubedl.Format = nil
	for _, f := range result.Info.Formats {
		hash := ytFormatHash(f)
		if hash == sourceIdentifier {
			format = &f
			break
		}
	}

	// Check if format was found
	if format == nil {
		return nil, nil, nil, fmt.Errorf("format not found")
	}

	// Get media info
	media, err := YouTubeMedia(result.Info).GetMedia(url)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get youtube media failed: %w", err)
	}

	// Find general format
	var generalFormat *info.Format = nil
	for _, f := range media.Formats {
		if f.SourceIdentifier == sourceIdentifier {
			generalFormat = &f
			break
		}
	}
	if generalFormat == nil {
		return nil, nil, nil, fmt.Errorf("general format not found")
	}

	// Get download reader
	reader, err := result.Download(ctx, format.FormatID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("download youtubedl failed: %w", err)
	}

	return media, generalFormat, reader, nil
}
