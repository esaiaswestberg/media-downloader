package info

import (
	"media-downloader/internal/media/sources"
	"media-downloader/internal/slice"
	"sort"
)

type Media struct {
	Url          string        `json:"url"`
	Title        string        `json:"title"`
	Duration     float64       `json:"duration"`
	VideoFormats []VideoFormat `json:"video_formats"`
	AudioFormats []AudioFormat `json:"audio_formats"`
}

type VideoFormat struct {
	VideoCodec   string  `json:"video_codec"`
	VideoBitrate float64 `json:"video_bitrate"`
	VideoWidth   int     `json:"video_width"`
	VideoHeight  int     `json:"video_height"`
	VideoFPS     float64 `json:"video_fps"`

	Format
}

type AudioFormat struct {
	AudioCodec      string  `json:"audio_codec"`
	AudioBitrate    float64 `json:"audio_bitrate"`
	AudioSampleRate float64 `json:"audio_sample_rate"`

	Format
}

type Format struct {
	Extension string `json:"extension"`
	Size      uint64 `json:"size"`

	Source           sources.Source `json:"source"`
	SourceIdentifier string         `json:"source_identifier"`
}

func (m *Media) CleanFormats() {
	// Remove unsupported video formats
	m.VideoFormats = slice.Filter(m.VideoFormats, func(format VideoFormat) bool {
		// Require a bitrate above zero
		if format.VideoBitrate <= 0 {
			return false
		}

		return true
	})

	// Remove unsupported audio formats
	m.AudioFormats = slice.Filter(m.AudioFormats, func(format AudioFormat) bool {
		// Require a bitrate above zero
		if format.AudioBitrate <= 0 {
			return false
		}

		return true
	})
}

func (m *Media) SortFormats() {
	// Sort video formats by resolution, bitrate and file size
	sort.Slice(m.VideoFormats, func(i, j int) bool {
		iRes := m.VideoFormats[i].VideoWidth * m.VideoFormats[i].VideoHeight
		jRes := m.VideoFormats[j].VideoWidth * m.VideoFormats[j].VideoHeight
		if iRes != jRes {
			return iRes > jRes
		}

		iBitrate := m.VideoFormats[i].VideoBitrate
		jBitrate := m.VideoFormats[j].VideoBitrate
		if iBitrate != jBitrate {
			return iBitrate > jBitrate
		}

		return m.VideoFormats[i].Size > m.VideoFormats[j].Size
	})

	// Sort audio formats by bitrate and file size
	sort.Slice(m.AudioFormats, func(i, j int) bool {
		iBitrate := m.AudioFormats[i].AudioBitrate
		jBitrate := m.AudioFormats[j].AudioBitrate
		if iBitrate != jBitrate {
			return iBitrate > jBitrate
		}

		return m.AudioFormats[i].Size > m.AudioFormats[j].Size
	})
}
