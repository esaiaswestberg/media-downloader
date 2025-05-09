package media

import (
	"context"
	"fmt"
	"io"
	"media-downloader/internal/media/info"
	"media-downloader/internal/media/sources"
	"media-downloader/internal/media/youtube"
)

func FetchMedia(ctx context.Context, url string) (*info.Media, error) {
	source := sources.IdentifySource(url)

	switch source {
	case sources.YouTube:
		return youtube.FetchMedia(ctx, url)
	default:
		return nil, fmt.Errorf("unsupported source: %s", source)
	}
}

func DownloadMedia(ctx context.Context, url string, source sources.Source, sourceIdentifier string) (*info.Media, *info.Format, io.ReadCloser, error) {
	switch source {
	case sources.YouTube:
		return youtube.DownloadMedia(ctx, url, sourceIdentifier)
	default:
		return nil, nil, nil, fmt.Errorf("unsupported source: %s", source)
	}
}
