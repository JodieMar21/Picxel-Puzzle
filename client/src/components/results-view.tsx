import { useState } from "react";
import { Download, Expand, FileText, Printer, Edit3, X, Save, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import LegoBrickDisplay from "./lego-brick-display";
import PixelEditor from "./pixel-editor";
import FractixLoader from "./fractix-loader";
import type { PixelationResult } from "@shared/schema";
import { calculateEstimatedBuildTime, getDifficultyLevel, generateConstructionGuideText, generateColorKeyDocument, generateVisualColorKey } from "@/lib/pixelation";
import { useAppSettings } from "@/features/settings/use-app-settings";
import { apiUrl } from "@/lib/apiBase";
import { getCurrentLicenseHeaders } from "@/lib/queryClient";


interface ResultsViewProps {
  results: PixelationResult;
  boardCount: number;
  boardLayout: string;
  boardRows: number;
  boardCols: number;
  projectId?: string;
  onGoBack?: () => void;
}

export default function ResultsView({ results, boardCount, boardLayout, boardRows, boardCols, projectId, onGoBack }: ResultsViewProps) {
  const { toast } = useToast();
  const { settings } = useAppSettings();
  const { pixelatedImageData, colorMap, boards, totalTiles } = results;
  const [isEditing, setIsEditing] = useState(false);
  const [editedResults, setEditedResults] = useState<PixelationResult>(results);
  const [showExpandedView, setShowExpandedView] = useState(false);
  const [visualGuides, setVisualGuides] = useState<string[]>([]);
  const [showVisualGuides, setShowVisualGuides] = useState(false);

  const boardTileSize =
    editedResults.boardTileSize ??
    editedResults.boards[0]?.pixels?.length ??
    32;
  const settingsTileDiffers = settings.tileSize !== boardTileSize;

  const saveToAppMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID available');
      
      const response = await fetch(apiUrl(`/api/projects/${projectId}/save`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCurrentLicenseHeaders() },
        credentials: "omit",
        body: JSON.stringify({
          name: `Saved Project ${new Date().toLocaleDateString()}`,
          pixelationResult: editedResults,
        }),
      });
      
      if (!response.ok) throw new Error('Save failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project saved!",
        description: "Your project has been saved to the app. You can access it from 'My Projects'.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "There was an error saving your project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate image data from edited board pixels
  const generateEditedImageData = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return editedResults.pixelatedImageData;

    const boardTileSize =
      editedResults.boardTileSize ??
      editedResults.boards[0]?.pixels?.length ??
      32;

    // Calculate total dimensions
    const totalCols = Math.max(...editedResults.boards.map(b => b.position.col + 1));
    const totalRows = Math.max(...editedResults.boards.map(b => b.position.row + 1));
    
    canvas.width = totalCols * boardTileSize;
    canvas.height = totalRows * boardTileSize;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each board
    editedResults.boards.forEach(board => {
      const boardStartX = board.position.col * boardTileSize;
      const boardStartY = board.position.row * boardTileSize;

      board.pixels.forEach((row, y) => {
        row.forEach((color, x) => {
          ctx.fillStyle = color;
          ctx.fillRect(boardStartX + x, boardStartY + y, 1, 1);
        });
      });
    });

    return canvas.toDataURL('image/png');
  };

  const handleDownloadImage = async () => {
    try {
      const imageData =
        generateEditedImageData() ||
        editedResults.pixelatedImageData ||
        pixelatedImageData;

      if (!imageData) {
        throw new Error('No image data available to download.');
      }

      const { saveImageWithDialog } = await import('@/lib/file-saver');
      const saved = await saveImageWithDialog(imageData, 'fractix-mosaic.png');
      if (saved) {
        toast({
          title: 'PNG downloaded',
          description: 'Your mosaic image has been saved.',
        });
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: 'Download failed',
        description:
          error instanceof Error ? error.message : 'Failed to download PNG. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProject = async () => {
    // Create a comprehensive project data object
    const projectData = {
      projectName: `Pixelated Project ${new Date().toLocaleDateString()}`,
      createdDate: new Date().toISOString(),
      pixelationResult: currentResults,
      settings: {
        boardCount,
        boardLayout
      },
      metadata: {
        totalTiles: totalTiles,
        uniqueColors: colorMap.length,
        boardCount: currentResults.boards.length,
        version: "1.0"
      }
    };

    const { saveProjectWithDialog } = await import('@/lib/file-saver');
    await saveProjectWithDialog(projectData);
  };

  const handleDownloadGuide = () => {
    const guideText = generateConstructionGuideText(editedResults);
    const blob = new Blob([guideText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'brick-construction-guide.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintGuide = () => {
    const guideText = generateConstructionGuideText(editedResults);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Brick Construction Guide</title></head>
          <body style="font-family: monospace; white-space: pre-wrap; padding: 20px;">
            ${guideText}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleGenerateColorKey = () => {
    try {
      console.log('Starting visual color key generation...');
      console.log('Current edited results:', editedResults);

      // Regenerate color map from current edited results
      const colorCounts = new Map<string, number>();
      
      editedResults.boards.forEach(board => {
        board.pixels.forEach(row => {
          row.forEach(color => {
            const count = colorCounts.get(color) || 0;
            colorCounts.set(color, count + 1);
          });
        });
      });

      console.log('Color counts:', Array.from(colorCounts.entries()));

      // Convert to colorMap format - use existing color map names when available
      const updatedColorMap = Array.from(colorCounts.entries()).map(([hex, count]) => {
        // Find the color name from original results
        const existingColor = results.colorMap.find(c => c.hex === hex);
        return {
          hex,
          name: existingColor?.name || 'Custom Color',
          count
        };
      });

      console.log('Updated color map:', updatedColorMap);

      // Create updated results with current color map
      const currentResults = {
        ...editedResults,
        colorMap: updatedColorMap
      };

      console.log('Calling generateVisualColorKey...');
      const guides = generateVisualColorKey(currentResults);
      setVisualGuides(guides);
      setShowVisualGuides(true);
      console.log('Visual color key generation completed');
    } catch (error) {
      console.error('Error generating visual color key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Visual guide generation failed: ${errorMessage}. Downloading text version instead.`);
      
      // Fallback to text version if visual generation fails
      const colorKeyText = generateColorKeyDocument(editedResults);
      const blob = new Blob([colorKeyText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lego-color-key.txt';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSaveChanges = (updatedResult: PixelationResult) => {
    setEditedResults(updatedResult);
  };

  const currentResults = editedResults; // Always use edited results to show saved changes

  const getBoardPreview = (board: any) => {
    // Create a simplified 8x8 preview from the full board
    const previewSize = 8;
    const sourceSize = board?.pixels?.length || boardTileSize;
    const preview = [];
    
    for (let y = 0; y < previewSize; y++) {
      for (let x = 0; x < previewSize; x++) {
        const sourceY = Math.floor((y / previewSize) * sourceSize);
        const sourceX = Math.floor((x / previewSize) * sourceSize);
        const color = board.pixels[sourceY]?.[sourceX] || '#FFFFFF';
        preview.push(color);
      }
    }
    
    return preview;
  };

  // Show pixel editor if in editing mode
  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">Pixel Editor</h2>
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(false)}
          >
            Back to Results
          </Button>
        </div>
        
        <PixelEditor 
          result={editedResults}
          onSaveChanges={handleSaveChanges}
          onGenerateColorKey={handleGenerateColorKey}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {saveToAppMutation.isPending && (
        <FractixLoader
          title="Saving to Fractix"
          subtitle="Storing your mosaic in My Projects"
          statusLabel="Saving your mosaic…"
          animateProgress
        />
      )}

      {settingsTileDiffers && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">
            Settings tile size is {settings.tileSize}×{settings.tileSize}, but this result used{" "}
            {boardTileSize}×{boardTileSize}.
          </p>
          <p className="text-muted-foreground mt-1">
            Go back to Configure and run{" "}
            <span className="font-medium text-foreground">Start Pixelation</span> again to apply the
            new tile size.
          </p>
          {onGoBack && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
              onClick={onGoBack}
            >
              Back to Configuration
            </Button>
          )}
        </div>
      )}

      {/* Header with Back Button and Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onGoBack && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGoBack}
              className="flex items-center space-x-2"
              disabled={saveToAppMutation.isPending}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Configuration</span>
            </Button>
          )}
          <h2 className="text-2xl font-semibold text-foreground">Results</h2>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Pixels
          </Button>
          <Button 
            variant="outline"
            onClick={handleGenerateColorKey}
          >
            <FileText className="w-4 h-4 mr-2" />
            Visual Guide
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pixelated Result */}
        <Card className="rounded-2xl border-border bg-card/70 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-foreground">Pixelated Result</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {(() => {
                    const maxCol = Math.max(...currentResults.boards.map(b => b.position.col));
                    const maxRow = Math.max(...currentResults.boards.map(b => b.position.row));
                    const totalWidth = (maxCol + 1) * boardTileSize;
                    const totalHeight = (maxRow + 1) * boardTileSize;
                    return `${totalWidth} × ${totalHeight} tiles`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2"
                  onClick={handleDownloadImage}
                  title="Download mosaic as PNG"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">PNG</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2"
                  onClick={() => setShowExpandedView(true)}
                  title="Expand full view"
                >
                  <Expand className="w-4 h-4" />
                  <span className="hidden sm:inline">Expand</span>
                </Button>
              </div>
            </div>
            
            <div 
              className="relative bg-muted rounded-lg overflow-hidden mb-4 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setShowExpandedView(true)}
              title="Click to expand full view"
            >
              <img 
                src={pixelatedImageData} 
                alt="Pixelated LEGO image" 
                className="w-full h-auto border-2 border-border pixelated-image"
                style={{ 
                  minHeight: '400px',
                  maxHeight: '600px',
                  objectFit: 'contain',
                  background: 'var(--muted)'
                }}
              />
              
              {/* Board overlay grid */}
              <div className="absolute inset-0 pointer-events-none board-overlay">
                {(() => {
                  // Calculate the grid dimensions based on actual board positions
                  const maxCol = Math.max(...currentResults.boards.map(b => b.position.col));
                  const maxRow = Math.max(...currentResults.boards.map(b => b.position.row));
                  const gridCols = maxCol + 1;
                  const gridRows = maxRow + 1;

                  return (
                    <div 
                      className="w-full h-full grid gap-1 p-2"
                      style={{ 
                        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                        gridTemplateRows: `repeat(${gridRows}, 1fr)`
                      }}
                    >
                      {/* Create grid positions */}
                      {Array.from({ length: gridRows * gridCols }).map((_, index) => {
                        const row = Math.floor(index / gridCols);
                        const col = index % gridCols;
                        const board = currentResults.boards.find(b => b.position.row === row && b.position.col === col);
                        
                        return (
                          <div 
                            key={`${row}-${col}`} 
                            className={`relative ${board ? 'border-2 border-black border-opacity-80 bg-black bg-opacity-5' : ''}`}
                            style={{ aspectRatio: '1/1' }}
                          >
                            {board && (
                              <>
                                <div className="absolute top-1 right-1 bg-black bg-opacity-90 text-white text-xs px-2 py-1 rounded font-semibold">
                                  {board.id}
                                </div>
                                <div className="absolute bottom-1 left-1 text-xs text-black font-medium bg-card bg-opacity-80 px-1 rounded">
                                  {boardTileSize}×{boardTileSize}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-3">
              Each outlined square represents one {boardTileSize}×{boardTileSize} baseplate. <span className="font-medium">Click image to expand full view.</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {projectId && (
                <Button 
                  onClick={() => saveToAppMutation.mutate()}
                  disabled={saveToAppMutation.isPending} 
                  className="rounded-xl flex-1 min-w-[140px]"
                  title="Save this project to the app so you can access it later"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveToAppMutation.isPending ? 'Saving to Fractix…' : 'Save to App'}
                </Button>
              )}
              
              <Button
                onClick={handleSaveProject}
                variant="outline"
                className="rounded-xl flex-1 min-w-[140px]"
                title="Download project as a file to your computer"
              >
                <Download className="w-4 h-4 mr-2" />
                Save Project File
              </Button>
              
              <Button
                onClick={handleDownloadImage}
                variant="outline"
                className="rounded-xl flex-1 min-w-[140px]"
                title="Download mosaic as PNG image"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Image
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Construction Guide */}
        <Card className="rounded-2xl border-border bg-card/70 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Construction Guide</h3>
            
            {/* Color Key */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-foreground mb-3">Color Key</h4>
              <div className="grid grid-cols-1 gap-2 text-sm max-h-48 overflow-y-auto">
                {currentResults.colorMap.sort((a, b) => b.count - a.count).map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2"
                  >
                    <div 
                      className="w-4 h-4 rounded border border-border shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-foreground font-medium flex-1">{color.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {color.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Assembly Instructions */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-foreground mb-3">Assembly Order</h4>
              <div className="space-y-2 text-sm">
                {currentResults.boards.slice(0, 4).map((board, index) => (
                  <div key={board.id} className="flex items-center space-x-3 p-2.5 bg-muted/50 border border-border/60 rounded-xl">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-foreground">
                      {index === 0 ? `Start with board ${board.id} (top-left)` :
                       index === 1 ? `Attach board ${board.id} to the right` :
                       `Add board ${board.id} to position`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={handleDownloadGuide} className="w-full bg-success hover:bg-success">
                <FileText className="w-4 h-4 mr-2" />
                Download Construction Guide
              </Button>
              <Button onClick={handlePrintGuide} variant="outline" className="w-full">
                <Printer className="w-4 h-4 mr-2" />
                Print Instructions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brick Visualization */}
      <LegoBrickDisplay 
        result={currentResults}
        boardCount={boardCount}
        boardLayout={boardLayout}
        boardRows={boardRows}
        boardCols={boardCols}
        onClick={() => setShowExpandedView(true)}
      />

      {/* Board Details */}
      <Card className="rounded-2xl border-border bg-card/70 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Individual Board Construction Guides</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Each board is a {boardTileSize}×{boardTileSize} LEGO baseplate. Use these previews to build section by section.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentResults.boards.map(board => {
              const preview = getBoardPreview(board);
              const boardColors = new Set(board.pixels.flat()).size;
              
              return (
                <Card key={board.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-foreground">Board {board.id}</h4>
                        <p className="text-xs text-muted-foreground">
                          Position: Row {board.position.row + 1}, Col {board.position.col + 1}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" title="Download this board's guide">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="bg-card border rounded aspect-square mb-3 relative">
                      <div className="absolute inset-0 grid grid-cols-8 gap-0 p-1">
                        {preview.map((color, index) => (
                          <div 
                            key={index}
                            className="border border-border"
                            style={{ backgroundColor: color }}
                            title={`Tile ${Math.floor(index / 8) + 1}, ${(index % 8) + 1}`}
                          />
                        ))}
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                        8×8 Preview
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Unique Colors:</span>
                        <span className="font-medium">{boardColors}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tiles:</span>
                        <span className="font-medium">1,024</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span className="font-medium">{boardTileSize}×{boardTileSize}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">How to use these guides:</h4>
            <ul className="text-sm text-foreground/90 space-y-1">
              <li>• Each board shows a simplified 8×8 preview of the full {boardTileSize}×{boardTileSize} pattern</li>
              <li>• Build boards in the order shown (A1, B1, A2, B2, etc.)</li>
              <li>• Each colored square represents 4×4 tiles in the final build</li>
              <li>• Use the colour key above to match brick tiles to colours</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Project Summary */}
      <Card className="rounded-2xl border-border bg-card/70 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Project Summary</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalTiles}</div>
              <div className="text-sm text-muted-foreground">Total Tiles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{colorMap.length}</div>
              <div className="text-sm text-muted-foreground">Colors Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{calculateEstimatedBuildTime(totalTiles)}</div>
              <div className="text-sm text-muted-foreground">Build Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{getDifficultyLevel(colorMap.length, totalTiles)}</div>
              <div className="text-sm text-muted-foreground">Difficulty</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Guide Modal */}
      <Dialog open={showVisualGuides} onOpenChange={setShowVisualGuides}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full overflow-auto">
          <DialogHeader>
            <DialogTitle>Visual Construction Guides</DialogTitle>
            <DialogDescription>
              Printable visual guides for each LEGO board. Right-click to save or use Ctrl+P to print.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {visualGuides.map((guide, index) => (
              <div key={index} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">
                    {index === 0 ? 'Project Overview' : `Board ${index}`}
                  </h3>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { saveImageWithDialog } = await import('@/lib/file-saver');
                        const filename = index === 0 ? 'fractix-project-overview.png' : `fractix-board-${index}-guide.png`;
                        await saveImageWithDialog(guide, filename);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          const title = index === 0 ? 'Fractix Project Overview' : `Fractix Board ${index} Guide`;
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>${title}</title>
                                <style>
                                  body { margin: 0; padding: 10px; text-align: center; }
                                  img { max-width: 100%; height: auto; }
                                  @media print { 
                                    body { padding: 0; margin: 0; } 
                                    img { max-width: 100%; max-height: 100vh; }
                                  }
                                </style>
                              </head>
                              <body>
                                <img src="${guide}" alt="${title}" />
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                  </div>
                </div>
                <div className="text-center">
                  <img 
                    src={guide} 
                    alt={index === 0 ? 'Project Overview' : `Board ${index} Visual Guide`}
                    className="max-w-full h-auto border border-border rounded"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">How to use these guides:</h4>
            <ul className="text-sm text-foreground/90 space-y-1">
              <li>• Each guide shows one {boardTileSize}×{boardTileSize} baseplate</li>
              <li>• Numbers around the edges show row/column positions</li>
              <li>• Each coloured square represents one tile</li>
              <li>• Use the colour legend at the bottom to match your pieces</li>
              <li>• Save individual guides or print them for easier assembly</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded View Modal */}
      <Dialog open={showExpandedView} onOpenChange={setShowExpandedView}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 bg-gray-900">
          <VisuallyHidden>
            <DialogTitle>Expanded Brick View</DialogTitle>
            <DialogDescription>Full-screen view of the brick mosaic</DialogDescription>
          </VisuallyHidden>
          
          {/* Close button overlay */}
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={() => setShowExpandedView(false)}
          >
            <X className="w-5 h-5" />
          </Button>
          
          {/* Full screen brick view */}
          <div className="w-full h-full flex items-center justify-center">
            <LegoBrickDisplay 
              result={currentResults}
              boardCount={boardCount}
              boardLayout={boardLayout}
              boardRows={boardRows}
              boardCols={boardCols}
              expandedMode={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
