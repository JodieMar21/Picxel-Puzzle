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
  boardRows: number;
  setBoardRows: (rows: number) => void;
  boardCols: number;
  setBoardCols: (cols: number) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  uploadedImage: File;
  imagePreview: string;
  onStartPixelation: (projectId: string) => void;
}
export default function BoardConfiguration({
  boardCount,
  setBoardCount,
  boardLayout,
  setBoardLayout,
  boardRows,
  setBoardRows,
  boardCols,
  setBoardCols,
  projectName,
  setProjectName,
  uploadedImage,
  imagePreview,
  onStartPixelation
}: BoardConfigurationProps) {
  const [adjustedImageData, setAdjustedImageData] = useState<string | null>(null);
  const { toast } = useToast();
  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; boardCount: number; boardLayout: string; boardRows: number; boardCols: number; image: File; adjustedImageData?: string }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('boardCount', data.boardCount.toString());
      formData.append('boardLayout', data.boardLayout);
      formData.append('boardRows', data.boardRows.toString());
      formData.append('boardCols', data.boardCols.toString());
      
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

  // Function to determine the correct layout value for the dropdown
  const getCurrentLayoutValue = () => {
    const currentLayout = `${boardRows}x${boardCols}`;
    const presetLayouts = ['1x1', '2x2', '3x2', '3x3', '4x2'];
    return presetLayouts.includes(currentLayout) ? currentLayout : 'custom';
  };

  const incrementRows = () => {
    if (boardRows < 10) {
      const newRows = boardRows + 1;
      setBoardRows(newRows);
      const newCount = newRows * boardCols;
      setBoardCount(newCount);
      const newLayout = `${boardCols}x${newRows}`;
      setBoardLayout(newLayout);
    }
  };

  const decrementRows = () => {
    if (boardRows > 1) {
      const newRows = boardRows - 1;
      setBoardRows(newRows);
      const newCount = newRows * boardCols;
      setBoardCount(newCount);
      const newLayout = `${boardCols}x${newRows}`;
      setBoardLayout(newLayout);
    }
  };

  const incrementCols = () => {
    if (boardCols < 10) {
      const newCols = boardCols + 1;
      setBoardCols(newCols);
      const newCount = boardRows * newCols;
      setBoardCount(newCount);
      const newLayout = `${newCols}x${boardRows}`;
      setBoardLayout(newLayout);
    }
  };

  const decrementCols = () => {
    if (boardCols > 1) {
      const newCols = boardCols - 1;
      setBoardCols(newCols);
      const newCount = boardRows * newCols;
      setBoardCount(newCount);
      const newLayout = `${newCols}x${boardRows}`;
      setBoardLayout(newLayout);
    }
  };

  const updateLayoutForCount = (count: number) => {
    switch (count) {
      case 1: 
        setBoardLayout('1x1'); 
        setBoardRows(1); 
        setBoardCols(1); 
        break;
      case 4: 
        setBoardLayout('2x2'); 
        setBoardRows(2); 
        setBoardCols(2); 
        break;
      case 6: 
        setBoardLayout('3x2'); 
        setBoardRows(2); 
        setBoardCols(3); 
        break;
      case 8: 
        setBoardLayout('4x2'); 
        setBoardRows(2); 
        setBoardCols(4); 
        break;
      case 9: 
        setBoardLayout('3x3'); 
        setBoardRows(3); 
        setBoardCols(3); 
        break;
      default: 
        const sqrt = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / sqrt);
        const newLayout = `${sqrt}x${rows}`;
        setBoardLayout(newLayout);
        setBoardRows(rows);
        setBoardCols(sqrt);
        break;
    }
  };

  const handleLayoutChange = (value: string) => {
    // Don't change anything if "custom" is selected - it's just a display state
    if (value === 'custom') {
      return;
    }
    
    setBoardLayout(value);
    switch (value) {
      case '1x1': 
        setBoardCount(1); 
        setBoardRows(1); 
        setBoardCols(1); 
        break;
      case '2x2': 
        setBoardCount(4); 
        setBoardRows(2); 
        setBoardCols(2); 
        break;
      case '3x2': 
        setBoardCount(6); 
        setBoardRows(2); 
        setBoardCols(3); 
        break;
      case '4x2': 
        setBoardCount(8); 
        setBoardRows(2); 
        setBoardCols(4); 
        break;
      case '3x3': 
        setBoardCount(9); 
        setBoardRows(3); 
        setBoardCols(3); 
        break;
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
      boardRows,
      boardCols,
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
        boardRows={boardRows}
        boardCols={boardCols}
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

          {/* Unique Layout for First Image Set */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              <h4 className="text-lg font-semibold text-purple-800">Board Grid Configuration</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rows Control */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                <Label className="block text-sm font-medium text-purple-700 mb-2">Rows</Label>
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={decrementRows}
                    disabled={boardRows <= 1}
                    className="border-purple-300 hover:bg-purple-50"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-bold text-purple-800 min-w-[2rem] text-center">
                    {boardRows}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={incrementRows}
                    disabled={boardRows >= 10}
                    className="border-purple-300 hover:bg-purple-50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Columns Control */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                <Label className="block text-sm font-medium text-blue-700 mb-2">Columns</Label>
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={decrementCols}
                    disabled={boardCols <= 1}
                    className="border-blue-300 hover:bg-blue-50"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-bold text-blue-800 min-w-[2rem] text-center">
                    {boardCols}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={incrementCols}
                    disabled={boardCols >= 10}
                    className="border-blue-300 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Total Boards Display */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <Label className="block text-sm font-medium text-gray-700 mb-2">Total Boards</Label>
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {boardCount}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">{boardRows}×{boardCols} grid</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Layout:</span> {boardLayout} • 
                <span className="font-medium"> Each board:</span> 32×32 tiles • 
                <span className="font-medium"> Total tiles:</span> {boardCount * 1024}
              </p>
            </div>
          </div>

          {/* Quick Preset Layouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</Label>
              <Select value={getCurrentLayoutValue()} onValueChange={handleLayoutChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x1">1×1 Grid (1 board)</SelectItem>
                  <SelectItem value="2x2">2×2 Grid (4 boards)</SelectItem>
                  <SelectItem value="3x2">3×2 Grid (6 boards)</SelectItem>
                  <SelectItem value="3x3">3×3 Grid (9 boards)</SelectItem>
                  <SelectItem value="4x2">4×2 Grid (8 boards)</SelectItem>
                  <SelectItem value="custom">Custom Layout ({boardCols}×{boardRows})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Legacy Board Count</Label>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={decrementBoards}
                  disabled={boardCount <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-semibold text-gray-900 min-w-[3rem] text-center">
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
