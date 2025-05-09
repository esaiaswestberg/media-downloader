import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const qualitySchema = z.object({
  quality: z.enum(['1080p', '720p', '480p', 'high', 'medium', 'low'], {
    errorMap: () => ({ message: "Please select a quality option" }),
  }),
});

type FormData = {
  url: string;
  quality?: '1080p' | '720p' | '480p' | 'high' | 'medium' | 'low';
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
              </FormItem>
            )}
          />
          {/* Changed button text from "Download" to "Next" */}
          <Button type="submit" className="w-full">
            Next
          </Button>
        </form>
      </Form>
    </motion.div>
  );
};

const QualityStep = ({ onNext, onBack, initialData }: StepProps) => {
  const form = useForm<z.infer<typeof qualitySchema>>({
    resolver: zodResolver(qualitySchema),
    defaultValues: {
      quality: initialData.quality,
    },
  });

  const onSubmit = (values: z.infer<typeof qualitySchema>) => {
    onNext(values);
  };

  // Watch the quality field to reactively enable/disable the button
  const selectedQuality = form.watch('quality');

  return (
    <motion.div {...motionProps} key="quality-form">
      <h1 className="text-2xl font-bold mb-6">Select Quality</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold mb-3">Video Quality</h2>
                  <FormField
                    control={form.control}
                    name="quality"
                    render={({ field }) => (
                      <FormItem> {/* Wrap RadioGroup in FormItem for potential error display */}
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="1080p" id="1080p" />
                              <Label htmlFor="1080p">1080p</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="720p" id="720p" />
                              <Label htmlFor="720p">720p</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="480p" id="480p" />
                              <Label htmlFor="480p">480p</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        {/* Optional: Add FormMessage here for validation errors */}
                        {/* <FormMessage /> */}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t md:border-l md:border-t-0 pt-6 md:pt-0 md:pl-6">
                  <h2 className="text-lg font-semibold mb-3">Audio Quality</h2>
                  <FormField
                    control={form.control}
                    name="quality"
                    render={({ field }) => (
                      <FormItem> {/* Wrap RadioGroup in FormItem */}
                         <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="high" id="high" />
                              <Label htmlFor="high">High (320kbps)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="medium" id="medium" />
                              <Label htmlFor="medium">Medium (192kbps)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="low" id="low" />
                              <Label htmlFor="low">Low (128kbps)</Label>
                            </div>
                          </RadioGroup>
                         </FormControl>
                         {/* Optional: Add FormMessage here for validation errors */}
                         {/* <FormMessage /> */}
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              // Corrected disabled check using form.watch
              disabled={!selectedQuality}
            >
              Download
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

const CompleteStep = ({ onNext, onBack, initialData }: StepProps) => {
   // initialData is not used in this component, but kept for signature consistency
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
    else if (step === 'quality') setStep('complete');
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
