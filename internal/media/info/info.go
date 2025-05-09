package info

import (
	"media-downloader/internal/media/sources"
	"media-downloader/internal/slice"
	"sort"
)

type Media struct {
	Url      string   `json:"url"`
	Title    string   `json:"title"`
	Duration float64  `json:"duration"`
	Formats  []Format `json:"formats"`
}

type Format struct {
	HasVideo     bool    `json:"has_video"`
	VideoCodec   string  `json:"video_codec"`
	VideoBitrate float64 `json:"video_bitrate"`
	VideoWidth   int     `json:"video_width"`
	VideoHeight  int     `json:"video_height"`
	VideoFPS     float64 `json:"video_fps"`

	HasAudio        bool    `json:"has_audio"`
	AudioCodec      string  `json:"audio_codec"`
	AudioBitrate    float64 `json:"audio_bitrate"`
	AudioSampleRate float64 `json:"audio_sample_rate"`

	Extension string `json:"extension"`
	Size      uint64 `json:"size"`

	Source           sources.Source `json:"source"`
	SourceIdentifier string         `json:"source_identifier"`
}

func (m *Media) CleanFormats() {
	// Remove formats that are not usable
	m.Formats = slice.Filter(m.Formats, func(format Format) bool {
		// Require either video or audio
		if !format.HasVideo && !format.HasAudio {
			return false
		}

		// Require video or audio bitrate above zero
		if format.VideoBitrate <= 0 && format.AudioBitrate <= 0 {
			return false
		}

		return true
	})
}

func (m *Media) SortFormats() {
	sort.Slice(m.Formats, func(a, b int) bool {
		aFormat := m.Formats[a]
		bFormat := m.Formats[b]

		// Sort by audio-only first
		if aFormat.HasVideo && !bFormat.HasVideo {
			return false
		} else if !aFormat.HasVideo && bFormat.HasVideo {
			return true
		}

		// Sort videos
		if aFormat.HasVideo && bFormat.HasVideo {
			return aFormat.VideoBitrate > bFormat.VideoBitrate
		}

		// Sort audio-only
		if aFormat.HasAudio && bFormat.HasAudio {
			return aFormat.AudioBitrate > bFormat.AudioBitrate
		}

		return false
	})
}
