import { useQuery, type QueryFunction } from '@tanstack/react-query'; // Use type-only import
import * as z from 'zod';

// Zod Schema for a single format object
const formatSchema = z.object({
  has_video: z.boolean(),
  video_codec: z.string(),
  video_bitrate: z.number(),
  video_width: z.number(),
  video_height: z.number(),
  video_fps: z.number(),
  has_audio: z.boolean(),
  audio_codec: z.string(),
  audio_bitrate: z.number(),
  audio_sample_rate: z.number(),
  extension: z.string(),
  size: z.number(),
  source: z.number(),
  source_identifier: z.string(),
});

// Zod Schema for the top-level response structure
const qualityInfoSchema = z.object({
  url: z.string(),
  title: z.string(),
  duration: z.number(),
  formats: z.array(formatSchema),
});

// Infer types
export type QualityInfo = z.infer<typeof qualityInfoSchema>;
export type Format = z.infer<typeof formatSchema>;

// Define the exact type for this query's key array, including the possibility of undefined URL
type QualityQueryKey = readonly ['qualityInfo', string | undefined];

// Data Fetching Function typed with QueryFunction and the specific key type
// The context parameter and its queryKey property will now match QualityQueryKey
const fetchQualityInfo: QueryFunction<QualityInfo, QualityQueryKey> = async ({ queryKey }) => {
  const [_key, url] = queryKey; // url is typed as string | undefined here

  // Although 'enabled: !!url' is used, TypeScript still sees url as string | undefined
  // based on the key type. A runtime check or assertion is needed if you want to
  // treat 'url' as definitely string here.
  if (url === undefined) {
      // This case should ideally not be reached if `enabled` is working correctly,
      // but this satisfies the type checker and provides a safeguard.
      console.error("fetchQualityInfo called with undefined URL");
      throw new Error("URL is required to fetch quality information");
  }

  // Now url is guaranteed to be a string within this block
  const apiUrl = `/api/quality?url=${encodeURIComponent(url)}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
     const errorBody = await response.text().catch(() => null);
     const errorMessage = errorBody || response.statusText;
     throw new Error(`Failed to fetch quality data: ${response.status} ${errorMessage}`);
  }

  const data = await response.json();

  // Validate and parse the data using Zod
  return qualityInfoSchema.parse(data);
};

// Custom Hook using Tanstack Query
export const useQualityInfo = (url: string | undefined) => {
  return useQuery<QualityInfo, Error, QualityInfo, QualityQueryKey>({ // Provide the key type as the 4th generic
    queryKey: ['qualityInfo', url] as const, // Use 'as const' for strict tuple type inference
    queryFn: fetchQualityInfo,
    enabled: !!url, // Only run the query if url is truthy
  });
};
