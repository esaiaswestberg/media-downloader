package sources

import (
	URL "net/url"
	"strings"
)

type Source int

const (
	YouTube Source = iota
	Unknown
)

func (s Source) String() string {
	switch s {
	case YouTube:
		return "YouTube"
	default:
		return "Unknown"
	}
}

const youtubeHostnames = "youtube.com;youtu.be;www.youtube.com;www.youtu.be;youtube-nocookie.com;www.youtube-nocookie.com"

func IdentifySource(url string) Source {
	urlObj, err := URL.Parse(url)
	if err != nil {
		return Unknown
	}

	hostname := strings.ToLower(urlObj.Hostname())

	// YouTube
	if contains(youtubeHostnames, hostname) {
		return YouTube
	}

	return Unknown
}

func contains(haystack string, needle string) bool {
	heystackValues := strings.Split(strings.ToLower(haystack), ";")
	for _, value := range heystackValues {
		if value == needle {
			return true
		}
	}
	return false
}
