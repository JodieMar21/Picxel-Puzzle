import { useState } from "react";
import { Minus, Plus, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ImageEditor from "@/components/image-editor";

interface BoardConfigurationProps {
  boardCount: number;
  setBoardCount: (count: number) => void;
  boardLayout: string;
  setBoardLayout: (layout: string) => void;
  uploadedImage: File;
  imagePreview: string;
  onStartPixelation: (projectId: string) => void;
}
export default function BoardConfiguration({
  boardCount,
  setBoardCount,
  boardLayout,
  setBoardLayout,
  uploadedImage,
  imagePreview,
  onStartPixelation
}: BoardConfigurationProps) {
  const [projectName, setProjectName] = useState('');
  const [adjustedImageData, setAdjustedImageData] = useState<string | null>(null);
  const { toast } = useToast();
  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; boardCount: number; boardLayout: string; image: File; adjustedImageData?: string }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('boardCount', data.boardCount.toString());
      formData.append('boardLayout', data.boardLayout);
      
      // Use adjusted image if available, otherwise original
      if (data.adjustedImageData) {
        // Convert base64 to blob
        const response = await fetch(data.adjustedImageData);
        const blob = await response.blob();
        formData.append('image', blob, 'adjusted-image.png');
      } else {
        formData.append('image', data.image);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: (project) => {
      toast({
        title: "Project created successfully",
        description: "Starting pixelation process...",
      });
      onStartPixelation(project.id);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const incrementBoards = () => {
    if (boardCount < 16) {
      const newCount = boardCount + 1;
      setBoardCount(newCount);
      updateLayoutForCount(newCount);
    }
  };

  const decrementBoards = () => {
    if (boardCount > 1) {
      const newCount = boardCount - 1;
      setBoardCount(newCount);
      updateLayoutForCount(newCount);
    }
  };

  const updateLayoutForCount = (count: number) => {
    switch (count) {
      case 1: setBoardLayout('1x1'); break;
      case 4: setBoardLayout('2x2'); break;
      case 6: setBoardLayout('3x2'); break;
      case 8: setBoardLayout('4x2'); break;
      case 9: setBoardLayout('3x3'); break;
      default: setBoardLayout('custom'); break;
    }
  };

  const handleLayoutChange = (value: string) => {
    setBoardLayout(value);
    switch (value) {
      case '1x1': setBoardCount(1); break;
      case '2x2': setBoardCount(4); break;
      case '3x2': setBoardCount(6); break;
      case '4x2': setBoardCount(8); break;
      case '3x3': setBoardCount(9); break;
    }
  };

  const calculateDimensions = () => {
    const tileSize = 8; // mm per tile
    const tilesPerBoard = 32;
    const totalTiles = Math.ceil(Math.sqrt(boardCount)) * tilesPerBoard;
    const mmSize = totalTiles * tileSize;
    
    return `${totalTiles}×${totalTiles} LEGO tiles (${mmSize}×${mmSize}mm)`;
  };

  const handleStartPixelation = () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate({
      name: projectName,
      boardCount,
      boardLayout,
      image: uploadedImage,
      adjustedImageData: adjustedImageData || undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* Image Editor */}
      <ImageEditor 
        imagePreview={imagePreview}
        boardCount={boardCount}
        boardLayout={boardLayout}
        onImageAdjusted={setAdjustedImageData}
      />

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Board Configuration</h3>
          
          <div className="space-y-6">
            {/* Project Name */}
            <div>
              <Label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </Label>
              <Input
                id="project-name"
                type="text"
                placeholder="Enter project name..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full"
              />
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Number of Boards</Label>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={decrementBoards}
                  disabled={boardCount <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-semibold text-gray-900 min-w-[3rem] text-center">
                  {boardCount}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={incrementBoards}
                  disabled={boardCount >= 16}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Each board = 32×32 brick tiles</p>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Board Layout</Label>
              <Select value={boardLayout} onValueChange={handleLayoutChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x1">1×1 Grid (1 board)</SelectItem>
                  <SelectItem value="2x2">2×2 Grid (4 boards)</SelectItem>
                  <SelectItem value="3x2">3×2 Grid (6 boards)</SelectItem>
                  <SelectItem value="3x3">3×3 Grid (9 boards)</SelectItem>
                  <SelectItem value="4x2">4×2 Grid (8 boards)</SelectItem>
                  <SelectItem value="custom">Custom Layout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Final Dimensions</p>
                <p className="text-sm text-gray-600">{calculateDimensions()}</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleStartPixelation}
            disabled={createProjectMutation.isPending}
            className="w-full"
            size="lg"
          >
            {createProjectMutation.isPending ? "Creating Project..." : "Start Pixelation Process"}
          </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
