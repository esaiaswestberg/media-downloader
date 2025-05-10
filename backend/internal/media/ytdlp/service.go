package ytdlp

import (
	"encoding/json"
	"fmt"
	"io"
	"media-downloader/internal/media/info"
	"media-downloader/internal/media/sources"
)

func GetAvailableFormats(url string) (media *info.Media, err error) {
	// Get the raw media mediaInfo
	var mediaInfo *MediaInfo
	mediaInfo, err = getRawMediaInfo(url)
	if err != nil {
		return nil, err
	}

	return &info.Media{
		Url:          url,
		Title:        mediaInfo.Title,
		Duration:     mediaInfo.Duration,
		VideoFormats: getVideoFormats(mediaInfo.Formats),
		AudioFormats: getAudioFormats(mediaInfo.Formats),
	}, nil
}

func getRawMediaInfo(url string) (mediaInfo *MediaInfo, err error) {
	// Run yt-dlp
	var stdout, stderr io.ReadCloser
	var wait func() error
	if stdout, stderr, wait, err = run(
		"yt-dlp",
		"--ignore-errors",
		"--check-all-formats",
		"--dump-single-json",
		"--quiet",
		url,
	); err != nil {
		return nil, fmt.Errorf("failed to run yt-dlp: %w", err)
	}

	// Read the output
	stdoutBytes, err := io.ReadAll(stdout)
	if err != nil {
		return nil, fmt.Errorf("failed to read stdout: %w", err)
	}
	stderrBytes, err := io.ReadAll(stderr)
	if err != nil {
		return nil, fmt.Errorf("failed to read stderr: %w", err)
	}

	// Wait for yt-dlp to finish
	if err = wait(); err != nil {
		return nil, fmt.Errorf("yt-dlp failed: %w", err)
	}

	// Check for errors
	if len(stderrBytes) > 0 {
		return nil, fmt.Errorf("yt-dlp failed: %s", stderrBytes)
	}

	// Parse the output
	if err := json.Unmarshal(stdoutBytes, &mediaInfo); err != nil {
		return nil, fmt.Errorf("failed to parse yt-dlp output: %w", err)
	}

	return mediaInfo, nil
}

func getVideoFormats(formats []Format) []info.VideoFormat {
	var videoFormats = make([]info.VideoFormat, 0)
	for _, format := range formats {
		// Ensure there is no audio
		if format.Acodec != "none" || format.Acodec == "" {
			continue
		}

		// Ensure there is a video codec
		if format.Vcodec == "none" || format.Vcodec == "" {
			continue
		}

		videoFormats = append(videoFormats, info.VideoFormat{
			VideoCodec:   format.Vcodec,
			VideoBitrate: format.Vbr,
			VideoWidth:   int(format.Width),
			VideoHeight:  int(format.Height),
			VideoFPS:     format.Fps,

			Format: info.Format{
				Extension: format.Ext,
				Size:      uint64(max(format.Filesize, format.FilesizeApprox)),

				Source:           sources.YouTube,
				SourceIdentifier: format.FormatID,
			},
		})
	}

	return videoFormats
}

func getAudioFormats(formats []Format) []info.AudioFormat {
	var audioFormats = make([]info.AudioFormat, 0)
	for _, format := range formats {
		// Ensure there is no video
		if format.Vcodec != "none" || format.Vcodec == "" {
			continue
		}

		// Ensure there is an audio codec
		if format.Acodec == "none" || format.Acodec == "" {
			continue
		}

		audioFormats = append(audioFormats, info.AudioFormat{
			AudioCodec:      format.Acodec,
			AudioBitrate:    format.Abr,
			AudioSampleRate: format.Asr,

			Format: info.Format{
				Extension: format.Ext,
				Size:      uint64(max(format.Filesize, format.FilesizeApprox)),

				Source:           sources.YouTube,
				SourceIdentifier: format.FormatID,
			},
		})
	}

	return audioFormats
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
