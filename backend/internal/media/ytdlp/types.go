package ytdlp

type MediaInfo struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Formats     []Format `json:"formats"`
	Duration    float64  `json:"duration"`
	OriginalURL string   `json:"original_url"`
}

type Format struct {
	FormatID           string  `json:"format_id"`
	FormatNote         string  `json:"format_note,omitempty"`
	Ext                string  `json:"ext"`
	Protocol           string  `json:"protocol"`
	Acodec             string  `json:"acodec,omitempty"`
	Vcodec             string  `json:"vcodec"`
	URL                string  `json:"url"`
	Width              int64   `json:"width,omitempty"`
	Height             int64   `json:"height,omitempty"`
	Fps                float64 `json:"fps,omitempty"`
	Rows               int64   `json:"rows,omitempty"`
	Columns            int64   `json:"columns,omitempty"`
	AudioExt           string  `json:"audio_ext"`
	VideoExt           string  `json:"video_ext"`
	Vbr                float64 `json:"vbr"`
	Abr                float64 `json:"abr"`
	Resolution         string  `json:"resolution"`
	AspectRatio        float64 `json:"aspect_ratio"`
	FilesizeApprox     int64   `json:"filesize_approx,omitempty"`
	Format             string  `json:"format"`
	Working            bool    `json:"__working"`
	ManifestURL        string  `json:"manifest_url,omitempty"`
	Language           string  `json:"language,omitempty"`
	Quality            float64 `json:"quality,omitempty"`
	HasDrm             bool    `json:"has_drm,omitempty"`
	SourcePreference   int64   `json:"source_preference,omitempty"`
	Asr                float64 `json:"asr,omitempty"`
	Filesize           int64   `json:"filesize,omitempty"`
	AudioChannels      int64   `json:"audio_channels,omitempty"`
	LanguagePreference int64   `json:"language_preference,omitempty"`
	Container          string  `json:"container,omitempty"`
}
