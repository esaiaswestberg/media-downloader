package www

import (
	"encoding/json"
	"fmt"
	"io"
	"media-downloader/internal/media"
	"media-downloader/internal/media/sources"
	"net/http"
)

func Initialize() error {
	http.HandleFunc("/api/quality", qualityHandler)
	http.HandleFunc("/api/download", downloadHandler)
	return http.ListenAndServe(":8080", nil)
}

func qualityHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := ParseQuery(r)
	urlParam, err := query.Get("url")
	if err != nil {
		http.Error(w, "Missing url parameter", http.StatusBadRequest)
		return
	}

	media, err := media.FetchMedia(r.Context(), urlParam)
	if err != nil {
		http.Error(w, "Failed to fetch video info", http.StatusInternalServerError)
		return
	}
	media.CleanFormats()
	media.SortFormats()

	jsonBytes, err := json.Marshal(media)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(jsonBytes)))
	_, err = w.Write(jsonBytes)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func downloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := ParseQuery(r)
	urlParam, err := query.Get("url")
	if err != nil {
		http.Error(w, "Missing url parameter", http.StatusBadRequest)
		return
	}

	source, err := query.GetInt("source")
	if err != nil {
		http.Error(w, "Missing source parameter", http.StatusBadRequest)
		return
	}

	sourceIdentifier, err := query.Get("source_identifier")
	if err != nil {
		http.Error(w, "Missing source_identifier parameter", http.StatusBadRequest)
		return
	}

	media, format, reader, err := media.DownloadMedia(r.Context(), urlParam, sources.Source(source), sourceIdentifier)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	filename := fmt.Sprintf("%s.%s", media.Title, format.Extension)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	_, err = io.Copy(w, reader)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
