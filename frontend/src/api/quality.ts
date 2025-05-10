import { useQuery, type QueryFunction } from '@tanstack/react-query';
import * as z from 'zod';

// Base Format schema matching Go's Format struct
const formatSchema = z.object({
  extension: z.string(),
  size: z.number(),
  source: z.number(),
  source_identifier: z.string(),
});

// VideoFormat schema matching Go's VideoFormat struct
const videoFormatSchema = formatSchema.extend({
  video_codec: z.string(),
  video_bitrate: z.number(),
  video_width: z.number(),
  video_height: z.number(),
  video_fps: z.number(),
});

// AudioFormat schema matching Go's AudioFormat struct
const audioFormatSchema = formatSchema.extend({
  audio_codec: z.string(),
  audio_bitrate: z.number(),
  audio_sample_rate: z.number(),
});

// Media schema matching Go's Media struct
const mediaInfoSchema = z.object({
  url: z.string(),
  title: z.string(),
  duration: z.number(),
  video_formats: z.array(videoFormatSchema),
  audio_formats: z.array(audioFormatSchema),
});

// Infer types
export type MediaInfo = z.infer<typeof mediaInfoSchema>;
export type VideoFormat = z.infer<typeof videoFormatSchema>;
export type AudioFormat = z.infer<typeof audioFormatSchema>;
export type Format = z.infer<typeof formatSchema>;

// Update the query key type
type QualityQueryKey = readonly ['qualityInfo', string | undefined];

const fetchQualityInfo: QueryFunction<MediaInfo, QualityQueryKey> = async ({ queryKey }) => {
  const [_key, url] = queryKey;

  if (url === undefined) {
    console.error("fetchQualityInfo called with undefined URL");
    throw new Error("URL is required to fetch quality information");
  }

  const apiUrl = `/api/quality?url=${encodeURIComponent(url)}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => null);
    const errorMessage = errorBody || response.statusText;
    throw new Error(`Failed to fetch quality data: ${response.status} ${errorMessage}`);
  }

  const data = await response.json();
  return mediaInfoSchema.parse(data);
};

export const useQualityInfo = (url: string | undefined) => {
  return useQuery<MediaInfo, Error, MediaInfo, QualityQueryKey>({
    queryKey: ['qualityInfo', url] as const,
    queryFn: fetchQualityInfo,
    enabled: !!url,
  });
};
