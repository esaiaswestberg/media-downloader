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
import type { Format } from '@/api/quality'; // Import QualityInfo type too

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
    if (format.has_video && format.has_audio) {
        // For formats with both video and audio
        return `${format.extension.toUpperCase()} Video+Audio (${format.video_height}p, ${format.video_fps}fps, ~${Math.round(format.video_bitrate)}kbps)`;
    } else if (format.has_video) {
        // For video-only formats
        return `${format.extension.toUpperCase()} Video Only (${format.video_height}p, ${format.video_fps}fps, ~${Math.round(format.video_bitrate)}kbps)`;
    } else if (format.has_audio) {
         // For audio-only formats
        return `${format.extension.toUpperCase()} Audio Only (${format.audio_codec}, ~${Math.round(format.audio_bitrate)}kbps)`;
    }
    return `${format.extension.toUpperCase()} (Unknown format)`;
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
    onNext({ quality: values.quality });
  };

  // Watch the quality field to reactively enable/disable the button
  const selectedQuality = form.watch('quality');

  // Filter and sort formats once data is loaded
  const videoFormats = qualityData?.formats
      .filter(format => format.has_video)
      // Sort video formats by resolution descending
      .sort((a, b) => b.video_height - a.video_height) || [];

  const audioFormats = qualityData?.formats
      .filter(format => format.has_audio && !format.has_video)
       // Sort audio-only formats by bitrate descending
      .sort((a, b) => b.audio_bitrate - a.audio_bitrate) || [];

  const hasVideoFormats = videoFormats.length > 0;
  const hasAudioFormats = audioFormats.length > 0;


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

      {/* Render the form only when qualityData is loaded */}
      {qualityData && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
               <CardHeader>
                   <CardTitle className="text-lg">Available Formats</CardTitle>
               </CardHeader>
              <CardContent className="pt-6">
                 {(hasVideoFormats || hasAudioFormats) ? (
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
                 ) : (
                   // Message when no video or audio formats are found
                   !isLoading && !isError && <p className="text-muted-foreground text-center">No suitable video or audio formats found for this URL.</p>
                 )}
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

       {/* Message if qualityData is null/undefined and not loading/erroring */}
        {!qualityData && !isLoading && !isError && (
            <motion.div {...motionProps} key="no-data" className="text-center py-8 text-muted-foreground">
                Enter a URL to see available quality options.
            </motion.div>
        )}


    </motion.div>
  );
};

const CompleteStep = ({ onNext, onBack }: StepProps) => {
  return (
    <motion.div {...motionProps} key="complete" className="text-center space-y-6">
      <h1 className="text-2xl font-bold">Thank You!</h1>
      <p className="text-muted-foreground">
        Your download will begin shortly. Thanks for using our service!
      </p>
      <div className="flex space-x-3">
        <Button
          variant="outline"
          className="flex-1"
          // Pass empty initialData when going back home
          onClick={() => onNext({ url: '', quality: undefined })}
        >
          Go Home
        </Button>
        <Button
          className="flex-1"
          onClick={onBack}
        >
          Back
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
  const [formData, setFormData] = useState<FormData>({ url: '' });

  const handleNext = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    if (step === 'url') setStep('quality');
    else if (step === 'quality') {
       // Here you would typically trigger the actual download using the selected quality (data.quality)
       console.log("Simulating download with data:", { url: formData.url, selectedFormatId: data.quality });
       setStep('complete');
    }
    else if (step === 'complete') {
      // Reset form data when going back to step 1 from complete
      setFormData({ url: '' });
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
          />
        )}
        {step === 'quality' && (
          <QualityStep
            onNext={handleNext}
            onBack={handleBack}
            initialData={formData}
          />
        )}
        {step === 'complete' && (
          <CompleteStep
            onNext={handleNext}
            onBack={handleBack}
            initialData={formData} // Pass initialData, though not used by CompleteStep
          />
        )}
      </AnimatePresence>
    </div>
  );
}
