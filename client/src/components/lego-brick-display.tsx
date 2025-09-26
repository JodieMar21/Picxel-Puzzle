import { useEffect, useRef } from "react";
import type { PixelationResult } from "@shared/schema";

interface BrickDisplayProps {
  result: PixelationResult;
  boardCount: number;
  boardLayout: string;
  onClick?: () => void;
  expandedMode?: boolean;
}

export default function LegoBrickDisplay({ result, boardCount, boardLayout, onClick, expandedMode = false }: BrickDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    ctx.fillStyle = adjustBrightness(color, 0.2); // Slightly brighter for 3D effect
    ctx.beginPath();
    ctx.arc(studCenterX, studCenterY, studRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add stud border
    ctx.strokeStyle = adjustBrightness(color, -0.3); // Darker border
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // Add highlight on stud for 3D effect
    ctx.fillStyle = adjustBrightness(color, 0.4);
    ctx.beginPath();
    ctx.arc(studCenterX - studRadius * 0.3, studCenterY - studRadius * 0.3, studRadius * 0.3, 0, 2 * Math.PI);
    ctx.fill();
  };

  const adjustBrightness = (hex: string, factor: number): string => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Adjust brightness
    const newR = Math.max(0, Math.min(255, r + (255 * factor)));
    const newG = Math.max(0, Math.min(255, g + (255 * factor)));
    const newB = Math.max(0, Math.min(255, b + (255 * factor)));
    
    // Convert back to hex
    return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result.boards.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions
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

    const totalPixelsWidth = gridCols * 32;
    const totalPixelsHeight = gridRows * 32;
    
    // Set tile size for clear visibility - calculate to fit viewport for expanded mode
    let tileSize;
    if (expandedMode) {
      // Calculate size to fit both width and height within 95% of viewport
      const maxCanvasWidth = window.innerWidth * 0.95;
      const maxCanvasHeight = window.innerHeight * 0.95;
      const tileSizeByWidth = maxCanvasWidth / totalPixelsWidth;
      const tileSizeByHeight = maxCanvasHeight / totalPixelsHeight;
      tileSize = Math.max(6, Math.floor(Math.min(tileSizeByWidth, tileSizeByHeight)));
    } else {
      tileSize = Math.max(8, Math.min(20, 800 / totalPixelsWidth));
    }
    
    canvas.width = totalPixelsWidth * tileSize;
    canvas.height = totalPixelsHeight * tileSize;

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each board
    result.boards.forEach(board => {
      const boardStartX = board.position.col * 32 * tileSize;
      const boardStartY = board.position.row * 32 * tileSize;

      // Draw each pixel in the board as a tile
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

  }, [result, boardCount, boardLayout]);

  // Expanded mode - just the canvas for popups
  if (expandedMode) {
    return (
      <canvas 
        ref={canvasRef}
        className="block"
        style={{ 
          imageRendering: 'pixelated',
          maxWidth: '95vw',
          maxHeight: '95vh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain'
        }}
      />
    );
  }

  // Normal mode - full component with container
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border">
        <h4 className="text-md font-medium text-gray-900 mb-3">Brick View</h4>
        <p className="text-sm text-gray-600 mb-4">
          Each circle represents one tile stud. Build your mosaic by placing tiles according to this pattern.
        </p>
        
        <div 
          className={`overflow-auto max-h-96 border rounded ${onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
          onClick={onClick}
          title={onClick ? "Click to expand full view" : undefined}
        >
          <canvas 
            ref={canvasRef}
            className="block"
            style={{ 
              imageRendering: 'pixelated',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          <p>• Each circular stud = 1 tile</p>
          <p>• Black borders show board boundaries (32×32 tiles each)</p>
          <p>• Board labels (A1, B1, etc.) show assembly order</p>
          {onClick && <p className="font-medium">• Click image to expand full view</p>}
        </div>
      </div>
    </div>
  );
}