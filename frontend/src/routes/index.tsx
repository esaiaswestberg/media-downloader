import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReloadIcon } from "@radix-ui/react-icons";
import {
  useQualityInfo,
  // Import the specific format types
  type VideoFormat,
  type AudioFormat,
} from "@/api/quality";

// Common animation props
const motionProps = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

// Schemas for each step
const urlSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

// Container options
const containerOptions = ["avi", "flv", "mkv", "mov", "mp4", "webm"];

// Updated quality schema to handle separate video and audio quality selections
// and container format
const qualitySchema = z.object({
  videoQuality: z.string().optional(),
  audioQuality: z.string().optional(),
  container: z.enum(["", ...containerOptions]).optional(),
}).refine(data => data.videoQuality || data.audioQuality, {
  message: "Select at least one video or audio format",
  path: ["videoQuality"] // Show the error on the video field
});

// Helper function to create a readable label for a format
const formatLabel = (format: VideoFormat | AudioFormat): string => {
  const parts: string[] = [];
  parts.push(format.extension.toUpperCase());

  const details: string[] = [];
  
  // Video format details
  if ("video_height" in format && format.video_height !== undefined) {
    const videoFormat = format as VideoFormat; 
    if (videoFormat.video_height) details.push(`${videoFormat.video_height}p`);
    if (videoFormat.video_fps) details.push(`${videoFormat.video_fps}fps`);
    if (videoFormat.video_bitrate)
      details.push(`~${Math.round(videoFormat.video_bitrate / 1000)}kbps`);
  }

  // Audio format details
  if ("audio_codec" in format && format.audio_codec !== undefined) {
    const audioFormat = format as AudioFormat;
    if (audioFormat.audio_codec) details.push(`${audioFormat.audio_codec}`);
    if (audioFormat.audio_bitrate)
      details.push(`~${Math.round(audioFormat.audio_bitrate / 1000)}kbps`);
  }

  if (details.length > 0) {
    parts.push(`(${details.join(", ")})`);
  } else {
    parts.push("(Details unavailable)");
  }

  // Append size if available
  if (format.size) {
    const sizeMB = (format.size / (1024 * 1024)).toFixed(2);
    parts.push(`[${sizeMB} MB]`);
  }

  return parts.join(" ");
};

type FormData = {
  url: string;
  videoQuality?: string;
  audioQuality?: string;
  container?: string;
};

interface StepProps {
  onNext: (data: Partial<FormData>) => void;
  onBack?: () => void;
  initialData: FormData;
}

const UrlStep = ({ onNext, initialData }: StepProps) => {
  const form = useForm<z.infer<typeof urlSchema>>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      url: initialData.url,
    },
  });

  const onSubmit = (values: z.infer<typeof urlSchema>) => {
    onNext(values);
  };

  return (
    <motion.div {...motionProps} key="url-form">
      <h1 className="text-2xl font-bold mb-6">Media Downloader</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Enter media URL (e.g., YouTube link)"
                    {...field}
                  />
                </FormControl>
                <FormMessage /> {/* Display validation errors */}
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Next
          </Button>
        </form>
      </Form>
    </motion.div>
  );
};

const QualityStep = ({ onNext, onBack, initialData }: StepProps) => {
  const { data: qualityData, isLoading, isError, error } = useQualityInfo(
    initialData.url,
  );

  const form = useForm<z.infer<typeof qualitySchema>>({
    resolver: zodResolver(qualitySchema),
    defaultValues: {
      videoQuality: initialData.videoQuality,
      audioQuality: initialData.audioQuality,
      container: initialData.container || "mp4", // Default to mp4
    },
  });

  // Set default selections when data is loaded
  useEffect(() => {
    if (qualityData && !isLoading) {
      const videoFormats = qualityData.video_formats || [];
      const audioFormats = qualityData.audio_formats || [];
      
      // Only set defaults if no values were previously selected
      const formValues = form.getValues();
      
      // If video formats exist and no video quality is selected yet, select the first one
      if (videoFormats.length > 0 && !formValues.videoQuality) {
        form.setValue("videoQuality", videoFormats[0].source_identifier);
      }
      
      // If audio formats exist and no audio quality is selected yet, select the first one
      if (audioFormats.length > 0 && !formValues.audioQuality) {
        form.setValue("audioQuality", audioFormats[0].source_identifier);
      }
    }
  }, [qualityData, isLoading, form]);

  const onSubmit = (values: z.infer<typeof qualitySchema>) => {
    const { videoQuality, audioQuality, container } = values;
    const videoFormats = qualityData?.video_formats || [];
    const audioFormats = qualityData?.audio_formats || [];
    
    // Find selected formats (if any)
    const selectedVideoFormat = videoQuality 
      ? videoFormats.find(f => f.source_identifier === videoQuality)
      : undefined;
      
    const selectedAudioFormat = audioQuality
      ? audioFormats.find(f => f.source_identifier === audioQuality)
      : undefined;
    
    // Get the source parameter (using video source if available, otherwise audio)
    const source = selectedVideoFormat?.source || selectedAudioFormat?.source;
    console.log(selectedVideoFormat)
    console.log(selectedAudioFormat)
    console.log(source)

    if (source !== undefined) {
      // Construct download URL with separate video and audio parameters
      let downloadUrl = `/api/download?url=${encodeURIComponent(initialData.url)}&source=${encodeURIComponent(String(source))}`;
      
      // Add video parameter if video selected
      if (videoQuality) {
        downloadUrl += `&video=${encodeURIComponent(videoQuality)}`;
      }
      
      // Add audio parameter if audio selected
      if (audioQuality) {
        downloadUrl += `&audio=${encodeURIComponent(audioQuality)}`;
      }
      
      // Add container parameter if selected
      if (container) {
        downloadUrl += `&container=${encodeURIComponent(container)}`;
      }

      // Initiate the download programmatically
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      // Suggest filename based on content title
      if (qualityData?.title) {
        // Use selected container if available, otherwise use format from selected video/audio
        const fileExtension = container || 
          (selectedVideoFormat?.extension || 
           selectedAudioFormat?.extension || "mp4");
        link.setAttribute("download", `${qualityData.title}.${fileExtension}`);
      } else {
        link.setAttribute("download", "");
      }

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 10);

      onNext({ videoQuality, audioQuality, container });
    } else {
      console.error("No source found for selected formats");
      alert("Error: Could not determine source for download.");
    }
  };

  // Watch the quality fields to reactively enable/disable the button
  const selectedVideoQuality = form.watch("videoQuality");
  const selectedAudioQuality = form.watch("audioQuality");

  // Access and sort video and audio formats from qualityData
  const videoFormats = qualityData?.video_formats
    ?.sort((a, b) => (b.video_height ?? 0) - (a.video_height ?? 0)) || [];

  const audioFormats = qualityData?.audio_formats
    ?.sort((a, b) => (b.audio_bitrate ?? 0) - (a.audio_bitrate ?? 0)) || [];

  const hasVideoFormats = videoFormats.length > 0;
  const hasAudioFormats = audioFormats.length > 0;

  // Check if data loaded but no formats were found (both arrays empty)
  const showNoFormatsMessage =
    !isLoading && !isError && qualityData && !(hasVideoFormats || hasAudioFormats);

  return (
    <motion.div {...motionProps} key="quality-form">
      <h1 className="text-2xl font-bold mb-6">Select Quality</h1>

      {isLoading && (
        <motion.div {...motionProps} key="loading" className="text-center py-8">
          {/* Shadcn/ui standard loading icon */}
          <ReloadIcon className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading quality options...</p>
        </motion.div>
      )}

      {isError && (
        <motion.div
          {...motionProps}
          key="error"
          className="text-center py-8 text-red-500"
        >
          <p>Error loading quality options:</p>
          <p className="text-sm mt-2">
            {error?.message || "An unknown error occurred."}
          </p>
        </motion.div>
      )}

      {/* Render the form only when qualityData is loaded and has formats */}
      {qualityData && (hasVideoFormats || hasAudioFormats) && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {qualityData.title || "Available Formats"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Video and Audio Selection in a side-by-side grid with items aligned to top */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Video Quality Section - self-start to ensure top alignment */}
                    {hasVideoFormats && (
                      <div className="self-start">
                        <FormField
                          control={form.control}
                          name="videoQuality"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Video Format</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex flex-col space-y-2"
                                >
                                  {/* Video format options */}
                                  {videoFormats.map((format) => (
                                    <FormItem
                                      key={format.source_identifier}
                                      className="flex items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <RadioGroupItem value={format.source_identifier} />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {formatLabel(format)}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                  
                                  {/* None option at the bottom */}
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer text-muted-foreground">
                                      None (No Video)
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Audio Quality Section - self-start to ensure top alignment */}
                    {hasAudioFormats && (
                      <div className="self-start">
                        <FormField
                          control={form.control}
                          name="audioQuality"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Audio Format</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex flex-col space-y-2"
                                >
                                  {/* Audio format options */}
                                  {audioFormats.map((format) => (
                                    <FormItem
                                      key={format.source_identifier}
                                      className="flex items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <RadioGroupItem value={format.source_identifier} />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {formatLabel(format)}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                  
                                  {/* None option at the bottom */}
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer text-muted-foreground">
                                      None (No Audio)
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Container Format Section */}
                  <FormField
                    control={form.control}
                    name="container"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Container Format</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-3 gap-2"
                          >
                            {/* Empty option first */}
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer text-muted-foreground">
                                Auto
                              </FormLabel>
                            </FormItem>
                            
                            {/* Container format options */}
                            {containerOptions.map((format) => (
                              <FormItem
                                key={format}
                                className="flex items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <RadioGroupItem value={format} />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {format.toUpperCase()}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Global validation message */}
                  {!(selectedVideoQuality || selectedAudioQuality) && (
                    <p className="text-sm text-muted-foreground">
                      Please select at least one video or audio format.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !qualityData || !(selectedVideoQuality || selectedAudioQuality)}
              >
                Download
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Message when no video or audio formats are found */}
      {showNoFormatsMessage && (
        <motion.div
          {...motionProps}
          key="no-data-found"
          className="text-muted-foreground text-center py-8"
        >
          No suitable video or audio formats found for this URL.
        </motion.div>
      )}

      {/* Message if qualityData is null/undefined and not loading/erroring */}
      {!qualityData && !isLoading && !isError && (
        <motion.div
          {...motionProps}
          key="no-data-initial"
          className="text-center py-8 text-muted-foreground"
        >
          Enter a URL to see available quality options.
        </motion.div>
      )}
    </motion.div>
  );
};

const CompleteStep = ({ onNext, onBack, initialData }: StepProps) => {
  console.log("Download initiated for:", initialData); 

  return (
    <motion.div {...motionProps} key="complete" className="text-center space-y-6">
      <h1 className="text-2xl font-bold">Download Initiated!</h1>
      <p className="text-muted-foreground">
        Your download should begin automatically. If not, check your browser's
        download manager.
      </p>
      <p className="text-sm text-gray-500">
        (Note: Large files may take time to appear or complete.)
      </p>
      <div className="flex space-x-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onNext({ url: "", videoQuality: undefined, audioQuality: undefined, container: undefined })}
        >
          Start Over
        </Button>
        <Button className="flex-1" onClick={onBack}>
          Back to Formats
        </Button>
      </div>
    </motion.div>
  );
};

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [step, setStep] = useState<"url" | "quality" | "complete">("url");
  // Use a more robust state for form data
  const [formData, setFormData] = useState<FormData>(() => {
    // Attempt to load from local storage or default
    try {
      const savedData = localStorage.getItem("downloaderFormData");
      return savedData
        ? JSON.parse(savedData)
        : { url: "", videoQuality: undefined, audioQuality: undefined, container: "mp4" };
    } catch (e) {
      console.error("Failed to load form data from local storage:", e);
      return { url: "", videoQuality: undefined, audioQuality: undefined, container: "mp4" };
    }
  });

  // Save form data to local storage whenever it changes
  useState(() => {
    try {
      localStorage.setItem("downloaderFormData", JSON.stringify(formData));
    } catch (e) {
      console.error("Failed to save form data to local storage:", e);
    }
  }, [formData]);

  const handleNext = (data: Partial<FormData>) => {
    const newData = { ...formData, ...data };

    if (step === "url") {
      // Reset qualities when going from URL to Quality step for a potentially new URL
      setFormData({ ...newData, videoQuality: undefined, audioQuality: undefined, container: "mp4" });
      setStep("quality");
    } else if (step === "quality") {
      // The download is initiated in the QualityStep's onSubmit.
      setFormData(newData); // Keep the selected qualities in state
      setStep("complete");
    } else if (step === "complete") {
      // Reset form data when going back to step 1 from complete
      setFormData(newData); // This will be the reset data with cleared fields
      setStep("url");
    }
  };

  const handleBack = () => {
    if (step === "quality") setStep("url");
    else if (step === "complete") setStep("quality");
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <AnimatePresence mode="wait">
        {step === "url" && (
          <UrlStep
            onNext={handleNext}
            initialData={formData}
            key="step-url"
          />
        )}
        {step === "quality" && (
          <QualityStep
            onNext={handleNext}
            onBack={handleBack}
            initialData={formData}
            key="step-quality"
          />
        )}
        {step === "complete" && (
          <CompleteStep
            onNext={handleNext}
            onBack={handleBack}
            initialData={formData}
            key="step-complete"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
