import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCw, Move, RotateCcw, Maximize2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ImageEditorProps {
  imagePreview: string;
  boardCount: number;
  boardLayout: string;
  onImageAdjusted?: (adjustedImageData: string) => void;
}

export default function ImageEditor({ imagePreview, boardCount, boardLayout, onImageAdjusted }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(new Image());
  
  // Image enhancement controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate image dimensions
    const image = imageRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Save context for transformations
    ctx.save();

    // Apply transformations from center
    ctx.translate(centerX + position.x, centerY + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Apply image enhancement filters
    const filters = [];
    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    if (sharpness !== 0) {
      // Create a sharpening effect using a custom filter
      const sharpenValue = 1 + (sharpness / 100);
      filters.push(`contrast(${100 + sharpness / 2}%)`);
    }
    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // Draw image centered
    const drawWidth = image.width;
    const drawHeight = image.height;
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Reset filter and restore context
    ctx.filter = 'none';
    ctx.restore();

    // Draw grid overlay to show board boundaries
    drawGridOverlay(ctx, canvas.width, canvas.height);
  }, [zoom, rotation, position, imageLoaded, boardLayout, boardCount, brightness, contrast, saturation, sharpness]);

  const drawGridOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Calculate grid dimensions based on board layout
    let gridCols, gridRows;
    
    switch (boardLayout) {
      case '1x1':
        gridCols = gridRows = 1;
        break;
      case '2x2':
        gridCols = gridRows = 2;
        break;
      case '3x2':
        gridCols = 3; gridRows = 2;
        break;
      case '3x3':
        gridCols = gridRows = 3;
        break;
      case '4x2':
        gridCols = 4; gridRows = 2;
        break;
      default:
        gridCols = gridRows = Math.ceil(Math.sqrt(boardCount));
    }

    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;

    // Draw vertical lines
    for (let i = 1; i < gridCols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 1; i < gridRows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(width, i * cellHeight);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  useEffect(() => {
    const image = imageRef.current;
    image.onload = () => {
      setImageLoaded(true);
      // Auto-fit image to square canvas (400x400)
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasSize = 400; // Fixed square canvas size
        const scaleX = canvasSize / image.width;
        const scaleY = canvasSize / image.height;
        const autoZoom = Math.min(scaleX, scaleY) * 0.8; // 80% of fit to start
        setZoom(autoZoom);
      }
    };
    image.src = imagePreview;
  }, [imagePreview]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleRotateLeft = () => setRotation(prev => prev - 90);
  const handleRotateRight = () => setRotation(prev => prev + 90);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleFitToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const image = imageRef.current;
    const canvasSize = 400; // Fixed square canvas size
    const scaleX = canvasSize / image.width;
    const scaleY = canvasSize / image.height;
    // Use Math.max to fill entire canvas (stretch if needed) instead of Math.min
    const autoZoom = Math.max(scaleX, scaleY) * 0.95;
    
    setZoom(autoZoom);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    
    // Export the adjusted image immediately after fitting
    setTimeout(() => exportAdjustedImage(), 100);
  };

  const exportAdjustedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onImageAdjusted) return;

    // Create a new canvas at the desired output resolution
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    // Set square output dimensions for processing
    const outputSize = 512;
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;

    // Redraw at output resolution
    outputCtx.fillStyle = '#ffffff';
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    const image = imageRef.current;
    const centerX = outputCanvas.width / 2;
    const centerY = outputCanvas.height / 2;

    outputCtx.save();
    outputCtx.translate(centerX + position.x * (outputCanvas.width / canvas.width), 
                       centerY + position.y * (outputCanvas.height / canvas.height));
    outputCtx.rotate((rotation * Math.PI) / 180);
    outputCtx.scale(zoom, zoom);

    // Apply the same enhancement filters to export
    const filters = [];
    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    if (sharpness !== 0) {
      filters.push(`contrast(${100 + sharpness / 2}%)`);
    }
    outputCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    const drawWidth = image.width * (outputCanvas.width / canvas.width);
    const drawHeight = image.height * (outputCanvas.height / canvas.height);
    outputCtx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    
    outputCtx.filter = 'none';
    outputCtx.restore();

    const adjustedImageData = outputCanvas.toDataURL('image/png');
    onImageAdjusted(adjustedImageData);
  };

  useEffect(() => {
    exportAdjustedImage();
  }, [zoom, rotation, position, brightness, contrast, saturation, sharpness]);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Image & Enhance Colors</h3>
        
        {/* Canvas Container - Perfect Square for 32x32 boards */}
        <div 
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 mx-auto"
          style={{ 
            width: '400px', 
            height: '400px',
            aspectRatio: '1/1'
          }}
        >
          <canvas
            ref={canvasRef}
            className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            width={400}
            height={400}
            style={{ 
              width: '100%', 
              height: '100%',
              display: 'block'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Grid overlay info */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            32×32 Board Preview
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Zoom Control */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Zoom: {Math.round(zoom * 100)}%
            </Label>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.1}
                max={3}
                step={0.01}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Image Enhancement Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brightness */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Brightness: {brightness}%
              </Label>
              <Slider
                value={[brightness]}
                onValueChange={([value]) => setBrightness(value)}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Contrast: {contrast}%
              </Label>
              <Slider
                value={[contrast]}
                onValueChange={([value]) => setContrast(value)}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Saturation: {saturation}%
              </Label>
              <Slider
                value={[saturation]}
                onValueChange={([value]) => setSaturation(value)}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Sharpness */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Sharpness: {sharpness}%
              </Label>
              <Slider
                value={[sharpness]}
                onValueChange={([value]) => setSharpness(value)}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Reset Enhancements Button */}
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setBrightness(100);
                setContrast(100);
                setSaturation(100);
                setSharpness(0);
              }}
            >
              Reset Enhancements
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRotateLeft}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Rotate Left
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotateRight}>
              <RotateCw className="w-4 h-4 mr-1" />
              Rotate Right
            </Button>
            <Button variant="outline" size="sm" onClick={handleFitToCanvas}>
              <Maximize2 className="w-4 h-4 mr-1" />
              Fit to Canvas
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <div className="flex items-start space-x-2">
              <Move className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">How to adjust your image:</p>
                <ul className="mt-1 space-y-1 text-blue-800">
                  <li>• Drag the image to reposition it</li>
                  <li>• Use zoom slider or buttons to scale</li>
                  <li>• Rotate left/right for better fit</li>
                  <li>• Adjust brightness, contrast, saturation & sharpness</li>
                  <li>• Click "Fit to Canvas" to fill entire board area</li>
                  <li>• Perfect square layout matches 32×32 brick boards</li>
                  <li>• Dashed lines show board boundaries</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}