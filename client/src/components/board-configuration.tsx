import { useEffect, useState } from "react";
import { Minus, Plus, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { getCurrentLicenseHeaders } from "@/lib/queryClient";
import ImageEditor from "@/components/image-editor";
import FractixLoader from "@/components/fractix-loader";
import { getAppSettings } from "@/features/settings/storage";
import { useAppSettings } from "@/features/settings/use-app-settings";

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
  const { settings } = useAppSettings();
  const maxBoards = settings.maxBoards;
  const tileSize = settings.tileSize;

  useEffect(() => {
    if (boardCount > maxBoards) {
      setBoardCount(maxBoards);
    }
  }, [boardCount, maxBoards, setBoardCount]);

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; boardCount: number; boardLayout: string; boardRows: number; boardCols: number; image: File; adjustedImageData?: string }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('boardCount', data.boardCount.toString());
      formData.append('boardLayout', data.boardLayout);
      formData.append('boardRows', data.boardRows.toString());
      formData.append('boardCols', data.boardCols.toString());
      formData.append('tileSize', String(getAppSettings().tileSize));
      
      // Use adjusted image if available, otherwise original
      if (data.adjustedImageData) {
        // Convert base64 to blob
        const response = await fetch(data.adjustedImageData);
        const blob = await response.blob();
        formData.append('image', blob, 'adjusted-image.png');
      } else {
        formData.append('image', data.image);
      }

      const response = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        headers: {
          ...getCurrentLicenseHeaders(),
        },
        credentials: "omit",
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
    if (boardCount < maxBoards) {
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
      const newCount = newRows * boardCols;
      if (newCount > maxBoards) return;
      setBoardRows(newRows);
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
      const newCount = boardRows * newCols;
      if (newCount > maxBoards) return;
      setBoardCols(newCols);
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
    const mmPerTile = 8;
    const tilesPerBoard = tileSize;
    const totalTiles = Math.ceil(Math.sqrt(boardCount)) * tilesPerBoard;
    const mmSize = totalTiles * mmPerTile;
    
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

  if (createProjectMutation.isPending) {
    return (
      <>
        <FractixLoader
          title="Creating your project"
          subtitle="Uploading image and preparing boards"
          statusLabel="Please wait until this finishes…"
          animateProgress
        />
        {/* Keep layout height stable while the full-screen overlay is up */}
        <div className="min-h-[320px]" aria-hidden />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <ImageEditor 
        imagePreview={imagePreview}
        boardCount={boardCount}
        boardLayout={boardLayout}
        boardRows={boardRows}
        boardCols={boardCols}
        onImageAdjusted={setAdjustedImageData}
      />

      <Card className="rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Board Configuration</h3>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="project-name" className="block text-sm font-medium text-foreground mb-2">
                Project Name
              </Label>
              <Input
                id="project-name"
                type="text"
                placeholder="Enter project name..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-xl"
              />
            </div>

            <div className="p-4 rounded-2xl border border-primary/25 bg-primary/5 mb-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                <h4 className="text-base font-semibold text-foreground">Board Grid Configuration</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card/80 p-4 rounded-xl border border-border shadow-sm">
                  <Label className="block text-sm font-medium text-muted-foreground mb-2">Rows</Label>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={decrementRows}
                      disabled={boardRows <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-2xl font-bold text-foreground min-w-[2rem] text-center">
                      {boardRows}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={incrementRows}
                      disabled={boardRows >= 10}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-card/80 p-4 rounded-xl border border-border shadow-sm">
                  <Label className="block text-sm font-medium text-muted-foreground mb-2">Columns</Label>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={decrementCols}
                      disabled={boardCols <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-2xl font-bold text-foreground min-w-[2rem] text-center">
                      {boardCols}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={incrementCols}
                      disabled={boardCols >= 10}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-card/80 p-4 rounded-xl border border-border shadow-sm">
                  <Label className="block text-sm font-medium text-muted-foreground mb-2">Total Boards</Label>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-foreground">
                      {boardCount}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">{boardRows}×{boardCols} grid</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl border border-border bg-muted/40">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Layout:</span> {boardLayout} •{" "}
                  <span className="font-medium text-foreground">Each board:</span> {tileSize}×{tileSize} tiles •{" "}
                  <span className="font-medium text-foreground">Total tiles:</span>{" "}
                  {boardCount * tileSize * tileSize}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="block text-sm font-medium text-foreground mb-2">Quick Presets</Label>
                <Select value={getCurrentLayoutValue()} onValueChange={handleLayoutChange}>
                  <SelectTrigger className="w-full rounded-xl">
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
                <Label className="block text-sm font-medium text-foreground mb-2">Legacy Board Count</Label>
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={decrementBoards}
                    disabled={boardCount <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-xl font-semibold text-foreground min-w-[3rem] text-center">
                    {boardCount}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={incrementBoards}
                    disabled={boardCount >= maxBoards}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-primary/20 bg-primary/10">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Final Dimensions</p>
                  <p className="text-sm text-muted-foreground">{calculateDimensions()}</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleStartPixelation}
              disabled={createProjectMutation.isPending}
              className="w-full rounded-xl"
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
