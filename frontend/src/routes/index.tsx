import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useQualityInfo } from '@/api/quality';
import type { Format } from '@/api/quality';

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

// Update quality schema to accept a string (the format source_identifier)
const qualitySchema = z.object({
  quality: z.string().min(1, "Please select a quality option"),
});

// Helper function to create a readable label for a format
const formatLabel = (format: Format): string => {
    const parts: string[] = [];
    parts.push(format.extension.toUpperCase());

    if (format.has_video && format.has_audio) {
        parts.push("Video+Audio");
    } else if (format.has_video) {
        parts.push("Video Only");
    } else if (format.has_audio) {
        parts.push("Audio Only");
    }

    const details: string[] = [];
    if (format.video_height) details.push(`${format.video_height}p`);
    if (format.video_fps) details.push(`${format.video_fps}fps`);
    if (format.video_bitrate) details.push(`~${Math.round(format.video_bitrate / 1000)}kbps Video`); // Convert bps to kbps

    if (format.audio_codec) details.push(`${format.audio_codec}`);
    if (format.audio_bitrate) details.push(`~${Math.round(format.audio_bitrate / 1000)}kbps Audio`); // Convert bps to kbps

    if (details.length > 0) {
        parts.push(`(${details.join(', ')})`);
    } else {
        // Fallback if no specific details found
         parts.push('(Details unavailable)');
    }

    // Append size if available
    if (format.size) {
        const sizeMB = (format.size / (1024 * 1024)).toFixed(2);
        parts.push(`[${sizeMB} MB]`);
    }

    return parts.join(' ');
};


type FormData = {
  url: string;
  // quality will now store the source_identifier string
  quality?: string;
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
                    placeholder="Enter media URL (e.e., YouTube link)"
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
  // Use the useQualityInfo hook to fetch data based on the initial URL
  const { data: qualityData, isLoading, isError, error } = useQualityInfo(initialData.url);

  const form = useForm<z.infer<typeof qualitySchema>>({
    resolver: zodResolver(qualitySchema),
    // Set the default value from initialData, which should be the selected source_identifier
    defaultValues: {
      quality: initialData.quality,
    },
  });

  const onSubmit = (values: z.infer<typeof qualitySchema>) => {
    // values.quality will contain the selected source_identifier
    const selectedFormat = qualityData?.formats.find(
      format => format.source_identifier === values.quality
    );

    if (selectedFormat) {
        // Construct the download URL
        // The download URL needs the original URL, format source, and source_identifier
        const downloadUrl = `/api/download?url=${encodeURIComponent(initialData.url)}&source=${encodeURIComponent(String(selectedFormat.source))}&source_identifier=${encodeURIComponent(selectedFormat.source_identifier)}`;

        // Initiate the download programmatically
        const link = document.createElement('a');
        link.href = downloadUrl;
        // Optionally set the download attribute to suggest a filename
        if (qualityData?.title && selectedFormat.extension) {
           link.setAttribute('download', `${qualityData.title}.${selectedFormat.extension}`);
        } else {
            link.setAttribute('download', ''); // Suggest browser infer filename
        }

        // Append to body, click, and remove quickly
        document.body.appendChild(link);
        link.click();

        // Clean up the element
        // Use a small timeout to ensure the click event registers before removal
        setTimeout(() => {
            document.body.removeChild(link);
        }, 10); // 10ms delay

        // Proceed to the next step (CompleteStep) after initiating the download
        // We pass the selected quality identifier to keep form state consistent
        onNext({ quality: values.quality });

    } else {
        console.error("Selected format not found in qualityData:", values.quality);
        // Optionally handle this error in the UI
        alert("Selected format details not found. Please try again."); // Simple alert for demo
    }
  };

  // Watch the quality field to reactively enable/disable the button
  const selectedQuality = form.watch('quality');

  // Filter and sort formats once data is loaded
  const videoFormats = qualityData?.formats
      // Filter for formats with video (and preferably audio too, or video only if needed)
      .filter(format => format.has_video)
      // Sort video formats by resolution descending
      .sort((a, b) => (b.video_height ?? 0) - (a.video_height ?? 0)) || []; // Handle null/undefined heights

  const audioFormats = qualityData?.formats
      // Filter for audio-only formats
      .filter(format => format.has_audio && !format.has_video)
       // Sort audio-only formats by bitrate descending
      .sort((a, b) => (b.audio_bitrate ?? 0) - (a.audio_bitrate ?? 0)) || []; // Handle null/undefined bitrates

  const hasVideoFormats = videoFormats.length > 0;
  const hasAudioFormats = audioFormats.length > 0;

  const showNoFormatsMessage = !isLoading && !isError && qualityData && !(hasVideoFormats || hasAudioFormats);

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
        <motion.div {...motionProps} key="error" className="text-center py-8 text-red-500">
          <p>Error loading quality options:</p>
          <p className="text-sm mt-2">{error?.message || 'An unknown error occurred.'}</p>
          {/* Optional: Add a retry button */}
        </motion.div>
      )}

      {/* Render the form only when qualityData is loaded and has formats */}
      {qualityData && (hasVideoFormats || hasAudioFormats) && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
               <CardHeader>
                   <CardTitle className="text-lg">{qualityData.title || "Available Formats"}</CardTitle>
               </CardHeader>
              <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="quality"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Select a format:</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6" // Apply grid layout here
                          >
                             {/* Video Quality Section */}
                             {hasVideoFormats && (
                                <div className="flex flex-col space-y-2">
                                   <h3 className="text-md font-semibold mb-1">Video Quality</h3>
                                    {videoFormats.map(format => (
                                      <FormItem key={format.source_identifier} className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                          {/* Use source_identifier as the value */}
                                          <RadioGroupItem value={format.source_identifier} />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                          {formatLabel(format)}
                                        </FormLabel>
                                      </FormItem>
                                    ))}
                                </div>
                             )}

                             {/* Audio Quality Section */}
                             {hasAudioFormats && (
                                 <div className={`${hasVideoFormats ? 'border-t md:border-l md:border-t-0 pt-6 md:pt-0 md:pl-6' : ''} flex flex-col space-y-2`}>
                                     <h3 className="text-md font-semibold mb-1">Audio Quality</h3>
                                     {audioFormats.map(format => (
                                      <FormItem key={format.source_identifier} className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                          {/* Use source_identifier as the value */}
                                          <RadioGroupItem value={format.source_identifier} />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                          {formatLabel(format)}
                                        </FormLabel>
                                      </FormItem>
                                    ))}
                                </div>
                             )}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage /> {/* Display validation errors for the whole group */}
                      </FormItem>
                    )}
                  />
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onBack}
                disabled={isLoading} // Disable back button while loading
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                // Disable if loading, no qualityData, or no quality selected
                disabled={isLoading || !qualityData || !selectedQuality}
              >
                Download
              </Button>
            </div>
          </form>
        </Form>
      )}

        {/* Message when no video or audio formats are found */}
       {showNoFormatsMessage && (
           <motion.div {...motionProps} key="no-data-found" className="text-muted-foreground text-center py-8">
               No suitable video or audio formats found for this URL.
           </motion.div>
       )}

       {/* Message if qualityData is null/undefined and not loading/erroring */}
        {!qualityData && !isLoading && !isError && (
            <motion.div {...motionProps} key="no-data-initial" className="text-center py-8 text-muted-foreground">
                Enter a URL to see available quality options.
            </motion.div>
        )}

    </motion.div>
  );
};


const CompleteStep = ({ onNext, onBack, initialData }: StepProps) => {
  // You could potentially display details about the chosen download here
  // using initialData if needed, but it's currently just a thank you.
  console.log("Download initiated for:", initialData); // Log the data passed to the complete step


  return (
    <motion.div {...motionProps} key="complete" className="text-center space-y-6">
      <h1 className="text-2xl font-bold">Download Initiated!</h1>
      <p className="text-muted-foreground">
        Your download should begin automatically. If not, check your browser's download manager.
      </p>
       <p className="text-sm text-gray-500">
           (Note: Large files may take time to appear or complete.)
       </p>
      <div className="flex space-x-3">
        <Button
          variant="outline"
          className="flex-1"
          // Pass empty initialData when going back home to reset the form state
          onClick={() => onNext({ url: '', quality: undefined })}
        >
          Start Over
        </Button>
        <Button
          className="flex-1"
          onClick={onBack}
        >
          Back to Formats
        </Button>
      </div>
    </motion.div>
  );
};


export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const [step, setStep] = useState<'url' | 'quality' | 'complete'>('url');
  // Use a more robust state for form data
  const [formData, setFormData] = useState<FormData>(() => {
      // Attempt to load from local storage or default
      try {
          const savedData = localStorage.getItem('downloaderFormData');
          return savedData ? JSON.parse(savedData) : { url: '', quality: undefined };
      } catch (e) {
          console.error("Failed to load form data from local storage:", e);
          return { url: '', quality: undefined };
      }
  });

  // Save form data to local storage whenever it changes
  useState(() => {
    try {
       localStorage.setItem('downloaderFormData', JSON.stringify(formData));
    } catch (e) {
        console.error("Failed to save form data to local storage:", e);
        // This can happen if local storage is disabled or full
    }
  }, [formData]);


  const handleNext = (data: Partial<FormData>) => {
    const newData = { ...formData, ...data };
    setFormData(newData);

    if (step === 'url') {
        // Reset quality when going from URL to Quality step for a new URL
        setFormData({ ...newData, quality: undefined });
        setStep('quality');
    } else if (step === 'quality') {
        // The download is initiated in the QualityStep's onSubmit.
        // We just transition the step here.
        setStep('complete');
    } else if (step === 'complete') {
      // Reset form data when going back to step 1 from complete
      // We already set { url: '', quality: undefined } in the CompleteStep's onNext call
      setStep('url');
    }
  };

  const handleBack = () => {
    if (step === 'quality') setStep('url');
    else if (step === 'complete') setStep('quality');
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <AnimatePresence mode="wait">
        {step === 'url' && (
          <UrlStep
            onNext={handleNext}
            initialData={formData}
            key="step-url" // Add key for AnimatePresence
          />
        )}
        {step === 'quality' && (
          <QualityStep
            onNext={handleNext}
            onBack={handleBack}
            initialData={formData}
             key="step-quality" // Add key for AnimatePresence
          />
        )}
        {step === 'complete' && (
          <CompleteStep
            onNext={handleNext}
            onBack={handleBack}
            initialData={formData} // Pass initialData, can be useful to show what was downloaded
             key="step-complete" // Add key for AnimatePresence
          />
        )}
      </AnimatePresence>
    </div>
  );
}
