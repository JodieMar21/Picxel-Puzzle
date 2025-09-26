import { useEffect, useState } from "react";
import { Cog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PixelationResult } from "@shared/schema";

interface ProcessingViewProps {
  projectId: string;
  onComplete: (result: PixelationResult) => void;
}

export default function ProcessingView({ projectId, onComplete }: ProcessingViewProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing...");

  const processingSteps = [
    "Analyzing image dimensions...",
    "Mapping colors to LEGO palette...",
    "Generating pixel grid...",
    "Creating board layouts...",
    "Optimizing color usage...",
    "Finalizing construction guide..."
  ];

  const processImageMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/process`);
      return response.json();
    },
    onSuccess: (result) => {
      setProgress(100);
      setCurrentStep("Processing complete!");
      setTimeout(() => onComplete(result), 1000);
    },
    onError: (error) => {
      setCurrentStep("Processing failed: " + error.message);
    }
  });

  useEffect(() => {
    // Start processing
    processImageMutation.mutate(projectId);

    // Simulate progress
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 15, 95);
        
        if (stepIndex < processingSteps.length) {
          setCurrentStep(processingSteps[stepIndex]);
          stepIndex++;
        }
        
        return newProgress;
      });
    }, 800);

    return () => clearInterval(progressInterval);
  }, [projectId]);

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
            <Cog className="text-white w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Your Image</h3>
            <p className="text-gray-600">Converting to brick-compatible pixel format...</p>
          </div>
          <div className="w-full max-w-md mx-auto">
            <Progress value={progress} className="h-3" />
          </div>
          <p className="text-sm text-gray-500">{currentStep}</p>
        </div>
      </CardContent>
    </Card>
  );
}
