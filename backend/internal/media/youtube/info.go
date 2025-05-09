package youtube

import (
	"context"
	"crypto/sha256"
	"fmt"
	"math"
	"media-downloader/internal/media/info"
	"media-downloader/internal/media/sources"

	"github.com/wader/goutubedl"
)

func FetchMedia(ctx context.Context, url string) (*info.Media, error) {
	// Get YouTube media result
	result, cached := cache.Get(url)
	if !cached {
		var err error
		var newResult goutubedl.Result
		if newResult, err = goutubedl.New(ctx, url, goutubedl.Options{}); err != nil {
			return nil, fmt.Errorf("new youtubedl failed: %w", err)
		}
		result = &newResult
		cache.Set(url, result)
	}

	return YouTubeMedia(result.Info).GetMedia(url)
}

type YouTubeMedia goutubedl.Info

func (m YouTubeMedia) GetMedia(url string) (*info.Media, error) {
	// TODO:
	// - Make clean url, don't use the one from the user

	return &info.Media{
		Url:      url,
		Title:    m.Title,
		Duration: m.Duration,
		Formats:  getFormats(m.Formats),
	}, nil
}

func getFormats(youtubeFormats []goutubedl.Format) []info.Format {
	// Create empty video and audio format slices
	videoFormats := make([]goutubedl.Format, 0)
	audioFormats := make([]goutubedl.Format, 0)

	// Iterate over the formats and separate video and audio formats
	for _, format := range youtubeFormats {
		// Ignore storyboards
		if format.FormatNote == "storyboard" {
			continue
		}

		// Ignore file sizes of 0 bytes
		if format.Filesize == 0 && format.FilesizeApprox == 0 {
			continue
		}

		// Check resolution if it's audio only
		if format.Resolution == "audio only" {
			audioFormats = append(audioFormats, format)
			continue
		}

		videoFormats = append(videoFormats, format)
	}

	mediaFormats := make([]info.Format, 0)

	// Filter video formats
	for i, format := range videoFormats {
		// Skip if extension is not mp4
		if format.Ext != "mp4" {
			continue
		}

		// Check against other video formats
		var skip bool = false
		for j, compareFormat := range videoFormats {
			// Ignore if format is the same
			if i == j {
				continue
			}

			// Ignore if compare extension is not mp4
			if compareFormat.Ext != "mp4" {
				continue
			}

			// Ignore if not the same resolution
			if format.Width != compareFormat.Width || format.Height != compareFormat.Height {
				continue
			}

			// Ignore if not the same fps
			if format.FPS != compareFormat.FPS {
				continue
			}

			// Skip if compare format has higher bitrate
			if compareFormat.VBR > format.VBR {
				skip = true
				break
			}
		}

		// Include if not skipped
		if !skip {
			mediaFormats = append(mediaFormats, ytFormatToMedia(format, true))
		}
	}

	// Filter audio formats
	for i, format := range audioFormats {
		var skip bool = false
		for j, compareFormat := range audioFormats {
			// Ignore if format is the same
			if i == j {
				continue
			}

			// Ignore if extension is not the same
			if format.Ext != compareFormat.Ext {
				continue
			}

			// Skip if compare format has higher bitrate
			if compareFormat.ABR > format.ABR {
				skip = true
				break
			}
		}

		if !skip {
			mediaFormats = append(mediaFormats, ytFormatToMedia(format, false))
		}
	}

	return mediaFormats
}

func ytFormatToMedia(format goutubedl.Format, isVideo bool) info.Format {
	return info.Format{
		HasVideo:     isVideo,
		VideoCodec:   format.VCodec,
		VideoBitrate: format.VBR,
		VideoWidth:   int(format.Width),
		VideoHeight:  int(format.Height),
		VideoFPS:     format.FPS,

		HasAudio:        true,
		AudioCodec:      format.ACodec,
		AudioBitrate:    format.ABR,
		AudioSampleRate: format.ASR,

		Extension: format.Ext,
		Size:      uint64(math.Max(format.Filesize, format.FilesizeApprox)),

		Source:           sources.YouTube,
		SourceIdentifier: ytFormatHash(format),
	}
}

func ytFormatHash(format goutubedl.Format) string {
	hash := sha256.New()
	hash.Write([]byte(format.FormatID))
	return fmt.Sprintf("%x", hash.Sum(nil))
}
