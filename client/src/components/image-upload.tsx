import { useCallback, useState } from "react";
import { CloudUpload, X, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageUpload: (file: File, preview: string) => void;
  uploadedImage: File | null;
  imagePreview: string | null;
}

export default function ImageUpload({ onImageUpload, uploadedImage, imagePreview }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or JPEG image.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setTimeout(() => {
        setIsUploading(false);
        onImageUpload(file, result);
        toast({
          title: "Image uploaded successfully",
          description: "You can now configure your boards.",
        });
      }, 1200);
    };
    reader.readAsDataURL(file);
  }, [onImageUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeImage = () => {
    onImageUpload(null as any, null as any);
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Card className="rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-sm overflow-hidden">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upload Your Image</h3>
        
        {!uploadedImage ? (
          <>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors duration-200 ${
                isDragging 
                  ? "border-primary bg-primary/15"
                  : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <CloudUpload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">Drop your image here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports PNG, JPG, JPEG up to 10MB</p>
                </div>
                <Button className="rounded-xl">Choose File</Button>
              </div>
            </div>

            <input
              id="file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Uploading image...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
              <div className="flex items-center space-x-3 min-w-0">
                <ImageIcon className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{uploadedImage.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadedImage.size)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={removeImage}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {imagePreview && (
              <div>
                <h4 className="text-md font-medium text-foreground mb-3">Original Image</h4>
                <div className="bg-muted/40 rounded-xl overflow-hidden border border-border">
                  <img 
                    src={imagePreview} 
                    alt="Original uploaded image" 
                    className="w-full h-64 object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
