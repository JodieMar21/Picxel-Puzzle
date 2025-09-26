import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Download, Save, Undo, Redo, Palette, ZoomIn, ZoomOut, Sun, Contrast, Zap, RotateCcw, Expand, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { PixelationResult, ColorUsage } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface PixelEditorProps {
  result: PixelationResult;
  onSaveChanges: (updatedResult: PixelationResult) => void;
  onGenerateColorKey: () => void;
}

interface PixelChange {
  boardId: string;
  x: number;
  y: number;
  oldColor: string;
  newColor: string;
}

interface ExpandedBrickEditorProps {
  result: PixelationResult;
  selectedColor: string;
  onPixelChange: (boardId: string, x: number, y: number, newColor: string) => void;
}

// Helper component for the expanded brick editor
function ExpandedBrickEditor({ result, selectedColor, onPixelChange }: ExpandedBrickEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [paintBatch, setPaintBatch] = useState<{boardId: string, x: number, y: number, oldColor: string}[]>([]);

  const drawBrickStud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    // Draw the base tile
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    
    // Draw border for 3D effect
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, size, size);
    
    // Calculate stud size and position
    const studRadius = size * 0.3;
    const studCenterX = x + size / 2;
    const studCenterY = y + size / 2;
    
    // Draw the raised stud (circle)
    ctx.fillStyle = adjustBrightness(color, 0.2);
    ctx.beginPath();
    ctx.arc(studCenterX, studCenterY, studRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add stud border
    ctx.strokeStyle = adjustBrightness(color, -0.3);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // Add highlight on stud for 3D effect
    ctx.fillStyle = adjustBrightness(color, 0.4);
    ctx.beginPath();
    ctx.arc(studCenterX - studRadius * 0.3, studCenterY - studRadius * 0.3, studRadius * 0.3, 0, 2 * Math.PI);
    ctx.fill();
  };

  const adjustBrightness = (hex: string, factor: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const newR = Math.max(0, Math.min(255, r + (255 * factor)));
    const newG = Math.max(0, Math.min(255, g + (255 * factor)));
    const newB = Math.max(0, Math.min(255, b + (255 * factor)));
    
    return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
  };

  const getPixelFromMouseEvent = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate which pixel was clicked
    const maxCol = Math.max(...result.boards.map(b => b.position.col));
    const maxRow = Math.max(...result.boards.map(b => b.position.row));
    const gridCols = maxCol + 1;
    const gridRows = maxRow + 1;
    const totalPixelsWidth = gridCols * 32;
    const totalPixelsHeight = gridRows * 32;
    const tileSize = canvas.width / totalPixelsWidth;
    
    const boardCol = Math.floor(x / (32 * tileSize));
    const boardRow = Math.floor(y / (32 * tileSize));
    const pixelX = Math.floor((x % (32 * tileSize)) / tileSize);
    const pixelY = Math.floor((y % (32 * tileSize)) / tileSize);

    // Find the corresponding board
    const board = result.boards.find(b => b.position.col === boardCol && b.position.row === boardRow);
    if (board && pixelX >= 0 && pixelX < 32 && pixelY >= 0 && pixelY < 32) {
      return { boardId: board.id, x: pixelX, y: pixelY, currentColor: board.pixels[pixelY][pixelX] };
    }
    return null;
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const pixelInfo = getPixelFromMouseEvent(event);
    if (pixelInfo) {
      setIsDragging(true);
      setPaintBatch([]);
      paintPixelInExpanded(pixelInfo);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    
    const pixelInfo = getPixelFromMouseEvent(event);
    if (pixelInfo) {
      paintPixelInExpanded(pixelInfo);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setPaintBatch([]);
  };

  const paintPixelInExpanded = (pixelInfo: {boardId: string, x: number, y: number, currentColor: string}) => {
    if (pixelInfo.currentColor === selectedColor) return;
    
    // Check if this pixel was already painted in this drag session
    const pixelKey = `${pixelInfo.boardId}-${pixelInfo.x}-${pixelInfo.y}`;
    const existingChange = paintBatch.find(change => 
      change.boardId === pixelInfo.boardId && change.x === pixelInfo.x && change.y === pixelInfo.y
    );
    
    if (!existingChange) {
      setPaintBatch(prev => [...prev, { boardId: pixelInfo.boardId, x: pixelInfo.x, y: pixelInfo.y, oldColor: pixelInfo.currentColor }]);
      onPixelChange(pixelInfo.boardId, pixelInfo.x, pixelInfo.y, selectedColor);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result.boards.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate grid dimensions
    const maxCol = Math.max(...result.boards.map(b => b.position.col));
    const maxRow = Math.max(...result.boards.map(b => b.position.row));
    const gridCols = maxCol + 1;
    const gridRows = maxRow + 1;
    
    const totalPixelsWidth = gridCols * 32;
    const totalPixelsHeight = gridRows * 32;
    
    // Calculate size to fit viewport
    const maxCanvasWidth = window.innerWidth * 0.75; // Leave space for color palette
    const maxCanvasHeight = window.innerHeight * 0.95;
    const tileSizeByWidth = maxCanvasWidth / totalPixelsWidth;
    const tileSizeByHeight = maxCanvasHeight / totalPixelsHeight;
    const tileSize = Math.max(6, Math.floor(Math.min(tileSizeByWidth, tileSizeByHeight)));
    
    canvas.width = totalPixelsWidth * tileSize;
    canvas.height = totalPixelsHeight * tileSize;

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each board
    result.boards.forEach(board => {
      const boardStartX = board.position.col * 32 * tileSize;
      const boardStartY = board.position.row * 32 * tileSize;

      // Draw each pixel as a tile
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const color = board.pixels[y]?.[x] || '#FFFFFF';
          const pixelX = boardStartX + (x * tileSize);
          const pixelY = boardStartY + (y * tileSize);
          
          drawBrickStud(ctx, pixelX, pixelY, tileSize, color);
        }
      }

      // Draw board boundary
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(boardStartX, boardStartY, 32 * tileSize, 32 * tileSize);
      
      // Add board label
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.max(12, tileSize)}px Arial`;
      ctx.fillText(board.id, boardStartX + 10, boardStartY + 25);
    });

  }, [result, selectedColor]);

  // Add global mouse event listeners for better drag performance
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (isDragging && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseEvent = {
          clientX: event.clientX,
          clientY: event.clientY,
          preventDefault: () => {}
        } as React.MouseEvent<HTMLCanvasElement>;
        
        if (event.clientX >= rect.left && event.clientX <= rect.right && 
            event.clientY >= rect.top && event.clientY <= rect.bottom) {
          handleMouseMove(mouseEvent);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  return (
    <canvas 
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      className="cursor-crosshair"
      style={{ 
        imageRendering: 'pixelated',
        maxWidth: '75vw',
        maxHeight: '95vh',
        width: 'auto',
        height: 'auto'
      }}
    />
  );
}

export default function PixelEditor({ result, onSaveChanges, onGenerateColorKey }: PixelEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<PixelChange[][]>([]);
  const [redoStack, setRedoStack] = useState<PixelChange[][]>([]);
  const [editedResult, setEditedResult] = useState<PixelationResult>(result);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [paintBatch, setPaintBatch] = useState<PixelChange[]>([]);
  const [showExpandedEditor, setShowExpandedEditor] = useState(false);
  const [expandedSelectedColor, setExpandedSelectedColor] = useState<string>('#000000');
  
  // Image enhancement controls
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(0);

  // Fetch available brick colors
  const { data: brickColors = [] } = useQuery<ColorUsage[]>({
    queryKey: ['/api/lego-colors']
  });

  const tileSize = 16; // Base tile size before zoom

  // Function to apply image enhancements to colors
  const applyEnhancements = (color: string): string => {
    // Convert hex to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Apply brightness (-100 to +100)
    let newR = r + (brightness * 2.55);
    let newG = g + (brightness * 2.55);
    let newB = b + (brightness * 2.55);
    
    // Apply contrast (-100 to +100)
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    newR = contrastFactor * (newR - 128) + 128;
    newG = contrastFactor * (newG - 128) + 128;
    newB = contrastFactor * (newB - 128) + 128;
    
    // Apply saturation (-100 to +100)
    const satFactor = (saturation + 100) / 100;
    const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
    newR = gray + satFactor * (newR - gray);
    newG = gray + satFactor * (newG - gray);
    newB = gray + satFactor * (newB - gray);
    
    // Clamp values to 0-255
    newR = Math.max(0, Math.min(255, Math.round(newR)));
    newG = Math.max(0, Math.min(255, Math.round(newG)));
    newB = Math.max(0, Math.min(255, Math.round(newB)));
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Function to reset all enhancements
  const resetEnhancements = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setSharpness(0);
  };

  // Function to apply enhancements to the entire result
  const applyEnhancementsToResult = () => {
    const enhancedResult = { ...editedResult };
    enhancedResult.boards = editedResult.boards.map(board => ({
      ...board,
      pixels: board.pixels.map(row => 
        row.map(color => applyEnhancements(color))
      )
    }));
    setEditedResult(enhancedResult);
    onSaveChanges(enhancedResult);
  };

  const drawEditor = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas dimensions
    const totalCols = Math.max(...editedResult.boards.map(b => b.position.col + 1));
    const totalRows = Math.max(...editedResult.boards.map(b => b.position.row + 1));
    const scaledTileSize = tileSize * zoomLevel;

    canvas.width = totalCols * 32 * scaledTileSize;
    canvas.height = totalRows * 32 * scaledTileSize;

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply pan offset
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);

    // Draw each board
    editedResult.boards.forEach(board => {
      const boardStartX = board.position.col * 32 * scaledTileSize;
      const boardStartY = board.position.row * 32 * scaledTileSize;

      // Highlight selected board
      if (selectedBoard === board.id) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(boardStartX - 2, boardStartY - 2, 32 * scaledTileSize + 4, 32 * scaledTileSize + 4);
      }

      // Draw pixels
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const color = board.pixels[y]?.[x] || '#FFFFFF';
          const pixelX = boardStartX + (x * scaledTileSize);
          const pixelY = boardStartY + (y * scaledTileSize);

          // Draw pixel with enhancements applied
          const enhancedColor = applyEnhancements(color);
          ctx.fillStyle = enhancedColor;
          ctx.fillRect(pixelX, pixelY, scaledTileSize, scaledTileSize);

          // Draw grid lines for better visibility
          if (zoomLevel >= 2) {
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(pixelX, pixelY, scaledTileSize, scaledTileSize);
          }
        }
      }

      // Draw board boundary
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(boardStartX, boardStartY, 32 * scaledTileSize, 32 * scaledTileSize);

      // Add board label
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.max(12, scaledTileSize)}px Arial`;
      ctx.fillText(board.id, boardStartX + 10, boardStartY + 25);
    });

    ctx.restore();
  };

  const paintPixel = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedColor) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoomLevel;
    const y = (event.clientY - rect.top - panOffset.y) / zoomLevel;

    // Find which board and pixel was clicked
    const board = editedResult.boards.find(b => {
      const boardStartX = b.position.col * 32 * tileSize;
      const boardStartY = b.position.row * 32 * tileSize;
      const boardEndX = boardStartX + (32 * tileSize);
      const boardEndY = boardStartY + (32 * tileSize);

      return x >= boardStartX && x < boardEndX && y >= boardStartY && y < boardEndY;
    });

    if (!board) return;

    const boardStartX = board.position.col * 32 * tileSize;
    const boardStartY = board.position.row * 32 * tileSize;
    const pixelX = Math.floor((x - boardStartX) / tileSize);
    const pixelY = Math.floor((y - boardStartY) / tileSize);

    if (pixelX >= 0 && pixelX < 32 && pixelY >= 0 && pixelY < 32) {
      const oldColor = board.pixels[pixelY]?.[pixelX] || '#FFFFFF';
      
      if (oldColor !== selectedColor) {
        // Record change for batch undo
        const change: PixelChange = {
          boardId: board.id,
          x: pixelX,
          y: pixelY,
          oldColor,
          newColor: selectedColor
        };
        
        // Add to current paint batch
        setPaintBatch(prev => [...prev, change]);

        // Apply change immediately
        const updatedResult = { ...editedResult };
        const targetBoard = updatedResult.boards.find(b => b.id === board.id);
        if (targetBoard) {
          if (!targetBoard.pixels[pixelY]) {
            targetBoard.pixels[pixelY] = new Array(32).fill('#FFFFFF');
          }
          targetBoard.pixels[pixelY][pixelX] = selectedColor;
        }

        setEditedResult(updatedResult);
      }
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 1 || (event.button === 0 && event.metaKey)) { // Middle click or Cmd+click for pan
      event.preventDefault();
      setIsDragging(true);
      setLastPan({ x: event.clientX, y: event.clientY });
    } else if (event.button === 0 && !event.metaKey) { // Left click for painting
      event.preventDefault();
      setIsPainting(true);
      setPaintBatch([]); // Start new paint batch
      paintPixel(event);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = event.clientX - lastPan.x;
      const deltaY = event.clientY - lastPan.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPan({ x: event.clientX, y: event.clientY });
    } else if (isPainting) {
      paintPixel(event);
    }
  };

  const handleMouseUp = () => {
    if (isPainting) {
      // Add the entire paint batch to undo stack as one operation
      if (paintBatch.length > 0) {
        setUndoStack(prev => [...prev, paintBatch]);
        setRedoStack([]); // Clear redo stack
        
        // Auto-save changes after painting
        onSaveChanges(editedResult);
      }
      setIsPainting(false);
      setPaintBatch([]);
    }
    setIsDragging(false);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastBatch = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, lastBatch]);
    setUndoStack(prev => prev.slice(0, -1));

    // Revert all changes in the batch
    const updatedResult = { ...editedResult };
    lastBatch.forEach(change => {
      const targetBoard = updatedResult.boards.find(b => b.id === change.boardId);
      if (targetBoard) {
        targetBoard.pixels[change.y][change.x] = change.oldColor;
      }
    });
    setEditedResult(updatedResult);
    
    // Auto-save the undo changes
    onSaveChanges(updatedResult);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const nextBatch = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, nextBatch]);
    setRedoStack(prev => prev.slice(0, -1));

    // Apply all changes in the batch
    const updatedResult = { ...editedResult };
    nextBatch.forEach(change => {
      const targetBoard = updatedResult.boards.find(b => b.id === change.boardId);
      if (targetBoard) {
        targetBoard.pixels[change.y][change.x] = change.newColor;
      }
    });
    setEditedResult(updatedResult);
    
    // Auto-save the redo changes
    onSaveChanges(updatedResult);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 8));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.25));
  };

  const handleSave = async () => {
    // Create a comprehensive project data object
    const projectData = {
      projectName: `Pixelated Project ${new Date().toLocaleDateString()}`,
      createdDate: new Date().toISOString(),
      pixelationResult: editedResult,
      settings: {
        brightness,
        contrast,
        saturation,
        sharpness
      },
      metadata: {
        totalTiles: editedResult.boards.reduce((total, board) => total + 1024, 0),
        uniqueColors: editedResult.colorMap.length,
        boardCount: editedResult.boards.length,
        version: "1.0"
      }
    };

    const { saveProjectWithDialog } = await import('@/lib/file-saver');
    const success = await saveProjectWithDialog(projectData);
    
    if (success) {
      // Also save changes to the current session
      onSaveChanges(editedResult);
    }
  };

  useEffect(() => {
    drawEditor();
  }, [editedResult, zoomLevel, panOffset, selectedBoard, brightness, contrast, saturation, sharpness]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Handle pixel changes in expanded editor
  const handleExpandedPixelChange = (boardId: string, x: number, y: number, newColor: string) => {
    const board = editedResult.boards.find(b => b.id === boardId);
    if (!board || !board.pixels[y]?.[x]) return;
    
    const oldColor = board.pixels[y][x];
    if (oldColor === newColor) return;
    
    const change: PixelChange = { boardId, x, y, oldColor, newColor };
    
    // Apply the change
    const newResult = { ...editedResult };
    const targetBoard = newResult.boards.find(b => b.id === boardId);
    if (targetBoard) {
      targetBoard.pixels[y][x] = newColor;
      setEditedResult(newResult);
      
      // Add to undo stack
      setUndoStack([...undoStack, [change]]);
      setRedoStack([]);
      
      // Auto-save changes back to parent component
      onSaveChanges(newResult);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editor Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pixel Editor</h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={undoStack.length === 0}>
                <Undo className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRedo} disabled={redoStack.length === 0}>
                <Redo className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button onClick={handleSave} title="Choose where to save your project file">
                <Save className="w-4 h-4 mr-2" />
                Save Project
              </Button>
              <Button variant="outline" onClick={onGenerateColorKey}>
                <Download className="w-4 h-4 mr-2" />
                Visual Guide
              </Button>
              <Button variant="outline" onClick={() => setShowExpandedEditor(true)}>
                <Expand className="w-4 h-4 mr-2" />
                Full View
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Click and drag to paint pixels • Middle-click or Cmd+click to pan • Ctrl+scroll to zoom
          </div>
        </CardContent>
      </Card>

      {/* Image Enhancement Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium">Image Enhancement</h4>
            <Button variant="outline" size="sm" onClick={resetEnhancements}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center">
                    <Sun className="w-4 h-4 mr-1" />
                    Brightness
                  </Label>
                  <span className="text-xs text-gray-500">{brightness}</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={(value) => setBrightness(value[0])}
                  min={-100}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center">
                    <Contrast className="w-4 h-4 mr-1" />
                    Contrast
                  </Label>
                  <span className="text-xs text-gray-500">{contrast}</span>
                </div>
                <Slider
                  value={[contrast]}
                  onValueChange={(value) => setContrast(value[0])}
                  min={-100}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center">
                    <Palette className="w-4 h-4 mr-1" />
                    Saturation
                  </Label>
                  <span className="text-xs text-gray-500">{saturation}</span>
                </div>
                <Slider
                  value={[saturation]}
                  onValueChange={(value) => setSaturation(value[0])}
                  min={-100}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center">
                    <Zap className="w-4 h-4 mr-1" />
                    Sharpness
                  </Label>
                  <span className="text-xs text-gray-500">{sharpness}</span>
                </div>
                <Slider
                  value={[sharpness]}
                  onValueChange={(value) => setSharpness(value[0])}
                  min={-100}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <Button onClick={applyEnhancementsToResult} className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              Apply Enhancements
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            Enhancements are previewed in real-time. Click "Apply Enhancements" to permanently save changes.
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-md font-medium mb-3">Colour Palette</h4>
          <div className="grid grid-cols-8 md:grid-cols-13 gap-2">
            {brickColors.map((color, index) => (
              <button
                key={index}
                className={`w-8 h-8 rounded border-2 transition-all ${
                  selectedColor === color.hex 
                    ? 'border-blue-500 ring-2 ring-blue-300' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color.hex }}
                onClick={() => setSelectedColor(color.hex)}
                title={color.name}
              />
            ))}
          </div>
          {selectedColor && (
            <div className="mt-3 p-2 bg-gray-50 rounded flex items-center space-x-2">
              <div 
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="text-sm font-medium">
                Selected: {brickColors.find(c => c.hex === selectedColor)?.name || 'Custom Colour'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Board Selection */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-md font-medium mb-3">Board Selection</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedBoard === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBoard(null)}
            >
              All Boards
            </Button>
            {editedResult.boards.map(board => (
              <Button
                key={board.id}
                variant={selectedBoard === board.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBoard(board.id)}
              >
                {board.id}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Canvas Editor */}
      <Card>
        <CardContent className="p-4">
          <div className="overflow-auto border rounded" style={{ maxHeight: '70vh' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair block"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Expanded Editor Modal */}
      <Dialog open={showExpandedEditor} onOpenChange={setShowExpandedEditor}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 bg-gray-900 flex flex-col">
          <VisuallyHidden>
            <div>Expanded Pixel Editor</div>
            <div>Full-screen brick editor with colour palette and drag painting</div>
          </VisuallyHidden>
          
          {/* Close button and color palette overlay */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="bg-black/50 text-white hover:bg-black/70"
              onClick={() => setShowExpandedEditor(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Color palette sidebar */}
          <div className="absolute top-4 left-4 z-10 bg-black/80 rounded-lg p-4 max-h-[90vh] overflow-y-auto">
            <div className="text-white text-sm font-medium mb-2">Colour Palette</div>
            <div className="text-white text-xs mb-3 opacity-75">Click and drag to paint</div>
            <div className="grid grid-cols-3 gap-2 w-48">
              {brickColors.map((color, index) => (
                <button
                  key={index}
                  className={`w-12 h-12 rounded border-2 transition-all ${
                    expandedSelectedColor === color.hex 
                      ? 'border-blue-400 ring-2 ring-blue-300' 
                      : 'border-gray-400 hover:border-gray-200'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => setExpandedSelectedColor(color.hex)}
                  title={color.name}
                />
              ))}
            </div>
            {expandedSelectedColor && (
              <div className="mt-3 p-2 bg-white/10 rounded flex items-center space-x-2">
                <div 
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: expandedSelectedColor }}
                />
                <span className="text-white text-sm font-medium">
                  {brickColors.find(c => c.hex === expandedSelectedColor)?.name || 'Custom'}
                </span>
              </div>
            )}
          </div>
          
          {/* Full screen brick editor */}
          <div className="flex-1 flex items-center justify-center">
            <ExpandedBrickEditor 
              result={editedResult}
              selectedColor={expandedSelectedColor}
              onPixelChange={handleExpandedPixelChange}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}