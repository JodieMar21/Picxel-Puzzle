import type { PixelationResult, ColorUsage, BoardData } from "@shared/schema";

export function calculateEstimatedBuildTime(totalTiles: number): string {
  // Rough estimate: 1 tile per 5-10 seconds depending on complexity
  const timeInMinutes = Math.round((totalTiles * 7) / 60);
  
  if (timeInMinutes < 60) {
    return `~${timeInMinutes} minutes`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return `~${hours}h ${minutes}m`;
  }
}

export function getDifficultyLevel(colorCount: number, totalTiles: number): string {
  if (colorCount <= 5 && totalTiles <= 1024) return "Beginner";
  if (colorCount <= 15 && totalTiles <= 4096) return "Intermediate";
  return "Advanced";
}

export function generateBoardLayout(boardCount: number): { cols: number; rows: number } {
  switch (boardCount) {
    case 1: return { cols: 1, rows: 1 };
    case 4: return { cols: 2, rows: 2 };
    case 6: return { cols: 3, rows: 2 };
    case 8: return { cols: 4, rows: 2 };
    case 9: return { cols: 3, rows: 3 };
    default: {
      const sqrt = Math.ceil(Math.sqrt(boardCount));
      return { cols: sqrt, rows: Math.ceil(boardCount / sqrt) };
    }
  }
}

export function downloadImageAsFile(dataUrl: string, filename: string) {
  console.log('Attempting to download file:', filename, 'Data URL length:', dataUrl.length);
  
  if (!dataUrl || dataUrl === 'data:,') {
    console.error('Invalid data URL provided for download');
    alert('Failed to generate visual guide. Please try again.');
    return;
  }
  
  try {
    // Convert data URL to blob for better browser compatibility
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    const blob = new Blob([u8arr], { type: mime });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.style.display = 'none';
    
    // Add link to DOM temporarily to ensure it works in all browsers
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('Download initiated successfully for:', filename);
    return true;
  } catch (error) {
    console.error('Error during download:', error);
    alert('Failed to download visual guide. Please try again.');
    return false;
  }
}

export function generateConstructionGuideText(result: PixelationResult): string {
  const { colorMap, boards, totalTiles } = result;
  
  let guide = "BRICK CONSTRUCTION GUIDE\n";
  guide += "========================\n\n";
  
  guide += `Total Tiles: ${totalTiles}\n`;
  guide += `Number of Boards: ${boards.length}\n`;
  guide += `Colors Used: ${colorMap.length}\n\n`;
  
  guide += "COLOR KEY:\n";
  guide += "----------\n";
  colorMap.sort((a, b) => b.count - a.count).forEach((color, index) => {
    guide += `${index + 1}. ${color.name} (${color.hex}) - ${color.count} tiles\n`;
  });
  
  guide += "\nASSEMBLY ORDER:\n";
  guide += "---------------\n";
  boards.forEach((board, index) => {
    guide += `${index + 1}. Board ${board.id} - Position: Row ${board.position.row + 1}, Column ${board.position.col + 1}\n`;
  });
  
  guide += "\nTIPS:\n";
  guide += "-----\n";
  guide += "- Start with the board in the top-left corner\n";
  guide += "- Work from left to right, top to bottom\n";
  guide += "- Sort your tiles by color before starting\n";
  guide += "- Take breaks to avoid eye strain\n";
  
  return guide;
}

export function generateColorKeyDocument(result: PixelationResult): string {
  const { colorMap, boards } = result;
  
  let document = `BRICK MOSAIC COLOUR KEY\n`;
  document += `===================\n\n`;
  
  // Color legend with letter codes
  document += `COLOR LEGEND:\n`;
  document += `------------\n`;
  colorMap.sort((a, b) => b.count - a.count).forEach((color, index) => {
    const symbol = String.fromCharCode(65 + (index % 26)); // A, B, C...
    document += `${symbol} = ${color.name} (${color.hex}) - ${color.count} tiles\n`;
  });
  
  document += `\n\nBOARD LAYOUT GUIDE:\n`;
  document += `------------------\n`;
  
  // Create simplified visual grid for each board
  boards.forEach(board => {
    document += `\nBoard ${board.id} (Position: Row ${board.position.row + 1}, Col ${board.position.col + 1}):\n`;
    document += `${'─'.repeat(32)}\n`;
    
    for (let y = 0; y < 32; y += 2) { // Show every 2nd row for better readability
      let row = '';
      for (let x = 0; x < 32; x++) {
        const color = board.pixels[y]?.[x] || '#FFFFFF';
        const colorIndex = colorMap.findIndex(c => c.hex === color);
        const symbol = colorIndex >= 0 ? String.fromCharCode(65 + (colorIndex % 26)) : '·';
        row += symbol;
      }
      document += `${row}\n`;
    }
    document += `${'─'.repeat(32)}\n`;
  });
  
  document += `\n\nASSEMBLY INSTRUCTIONS:\n`;
  document += `--------------------\n`;
  document += `1. Print this color key document\n`;
  document += `2. Sort tiles by colour according to legend above\n`;
  document += `3. Start with Board A1 (top-left position)\n`;
  document += `4. Follow the letter pattern for each board\n`;
  document += `5. Build row by row, left to right\n`;
  document += `6. Connect completed boards as shown in layout\n\n`;
  
  document += `SHOPPING LIST:\n`;
  document += `-------------\n`;
  colorMap.forEach(color => {
    document += `${color.name}: ${color.count} tiles\n`;
  });
  
  document += `\nTotal tiles needed: ${colorMap.reduce((sum, color) => sum + color.count, 0)}\n`;
  document += `Total boards: ${boards.length} (32×32 baseplates)\n`;
  
  return document;
}

// Helper function to get contrasting text color
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Generate visual color key - one page per board - returns image data URLs
export function generateVisualColorKey(result: PixelationResult): string[] {
  console.log('Starting visual color key generation with', result.boards.length, 'boards');
  const { colorMap, boards } = result;
  
  // Sort colors by frequency (most used first)
  const sortedColors = [...colorMap].sort((a, b) => b.count - a.count);
  console.log('Sorted colors:', sortedColors.length, 'colors found');
  
  const generatedImages: string[] = [];
  
  // Create unique symbols for each color
  const colorSymbols = [
    '●', '■', '▲', '♦', '★', '✚', '◆', '▼', '◉', '□', 
    '△', '◇', '☆', '✖', '◈', '▽', '◎', '▢', '⬟', '⬡',
    '⬢', '⬣', '⬤', '⬜', '⬝', '⬞', '⬠', '⬟', '⭐', '⭕'
  ];

  // Generate one page per board
  boards.forEach((board, boardIndex) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions for single board - optimized for printing
    const cellSize = 18; // Optimized cell size for printing
    const gridSize = 32 * cellSize; // 32x32 grid
    const titleHeight = 60; // Space for title
    // Calculate legend height based on number of colours (will be calculated later)
    const maxLegendHeight = 300; // Reserve space for legend
    const padding = 30; // Padding around edges
    
    canvas.width = gridSize + (padding * 2);
    canvas.height = titleHeight + gridSize + maxLegendHeight + (padding * 2);

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title - split into two lines to prevent overlap
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Board ${boardIndex + 1}`, canvas.width / 2, 25);
    ctx.font = '16px Arial';
    ctx.fillText(`Position: Row ${board.position.row + 1}, Column ${board.position.col + 1}`, canvas.width / 2, 45);

    const gridStartY = titleHeight + padding;
    
    // Draw column numbers (1-32)
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    for (let col = 1; col <= 32; col++) {
      const x = padding + (col - 1) * cellSize + cellSize / 2;
      const y = gridStartY - 8;
      ctx.fillText(col.toString(), x, y);
    }

    // Draw row numbers (1-32)
    ctx.textAlign = 'right';
    for (let row = 1; row <= 32; row++) {
      const x = padding - 8;
      const y = gridStartY + (row - 1) * cellSize + cellSize / 2 + 4;
      ctx.fillText(row.toString(), x, y);
    }

    // Draw the pixel grid with colours and symbols
    board.pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        const cellX = padding + x * cellSize;
        const cellY = gridStartY + y * cellSize;

        // Fill cell with colour
        ctx.fillStyle = color;
        ctx.fillRect(cellX, cellY, cellSize, cellSize);

        // Draw black border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cellX, cellY, cellSize, cellSize);

        // Draw symbol for the colour
        const colorIndex = sortedColors.findIndex(c => c.hex === color);
        if (colorIndex >= 0 && colorIndex < colorSymbols.length) {
          const symbol = colorSymbols[colorIndex];
          ctx.fillStyle = getContrastColor(color);
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(symbol, cellX + cellSize / 2, cellY + cellSize / 2 + 3);
        }
      });
    });

    // Draw colour legend at the bottom
    const legendY = titleHeight + padding + gridSize + 40;
    const maxColoursPerRow = 3; // Fewer colours per row for better spacing
    const legendItemWidth = (gridSize) / maxColoursPerRow;
    
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText('COLOUR LEGEND:', padding, legendY);

    // Get colours used in this specific board
    const boardColours = new Set();
    board.pixels.forEach(row => {
      row.forEach(color => boardColours.add(color));
    });
    
    const boardColourList = sortedColors.filter(color => boardColours.has(color.hex));

    boardColourList.forEach((color, index) => {
      if (index >= colorSymbols.length) return; // Skip if we run out of symbols
      
      const colorIndex = sortedColors.findIndex(c => c.hex === color.hex);
      const rowNum = Math.floor(index / maxColoursPerRow);
      const colNum = index % maxColoursPerRow;
      const x = padding + colNum * legendItemWidth;
      const y = legendY + 30 + rowNum * 45; // Optimized spacing

      // Draw colour swatch
      ctx.fillStyle = color.hex;
      ctx.fillRect(x, y, 28, 28);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 28, 28);

      // Draw symbol in swatch
      ctx.fillStyle = getContrastColor(color.hex);
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(colorSymbols[colorIndex], x + 14, y + 19);

      // Draw colour info
      ctx.fillStyle = '#000000';
      ctx.font = '13px Arial';
      ctx.textAlign = 'left';
      const boardColorCount = board.pixels.flat().filter(c => c === color.hex).length;
      ctx.fillText(`${boardColorCount} pieces`, x + 35, y + 12);
      ctx.font = 'bold 11px Arial';
      ctx.fillText(color.name, x + 35, y + 26);
    });

    // Generate the image data for this board
    console.log(`Generating image data for board ${boardIndex + 1}`);
    const imageData = canvas.toDataURL('image/png');
    console.log(`Canvas to data URL complete for board ${boardIndex + 1}, size: ${imageData.length} chars`);
    generatedImages.push(imageData);
  });
  
  // Generate overview page with full image and complete color list
  const overviewImage = generateFullOverviewPage(result, sortedColors, colorSymbols);
  generatedImages.unshift(overviewImage); // Add overview as first page
  
  console.log(`Visual guide generation complete. Generated ${generatedImages.length} guides (1 overview + ${boards.length} boards).`);
  return generatedImages;
}

// Generate overview page with full brick image and complete colour list
function generateFullOverviewPage(result: PixelationResult, sortedColors: any[], colorSymbols: string[]): string {
  const { colorMap, boards } = result;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Calculate full image dimensions
  const totalCols = Math.max(...boards.map(b => b.position.col + 1));
  const totalRows = Math.max(...boards.map(b => b.position.row + 1));
  
  // Optimize canvas size for printing - fit on standard page
  const maxImageWidth = 800; // Larger width since colour list is below
  const boardPixelSize = 12; // Slightly larger pixels for better visibility
  const imageWidth = Math.min(totalCols * 32 * boardPixelSize, maxImageWidth);
  const imageHeight = (totalRows * 32 * boardPixelSize) * (imageWidth / (totalCols * 32 * boardPixelSize));
  
  const padding = 30;
  const colourListHeight = Math.ceil(sortedColors.length / 4) * 45 + 100; // Space for colour list below
  
  canvas.width = Math.max(imageWidth, 600) + (padding * 2); // Ensure minimum width
  canvas.height = imageHeight + colourListHeight + 200 + (padding * 2); // Space for title, image, colour list, and summary
  
  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PICXEL OVERVIEW', canvas.width / 2, 40);
  
  // Draw subtitle
  ctx.font = '16px Arial';
  ctx.fillText(`${totalRows}×${totalCols} Boards (${totalRows * totalCols * 1024} Total Pieces)`, canvas.width / 2, 65);
  
  // Draw the full brick image - centered
  const imageStartY = 90;
  const scaleFactor = imageWidth / (totalCols * 32);
  const imageStartX = (canvas.width - imageWidth) / 2; // Center the image
  
  boards.forEach(board => {
    const boardStartX = imageStartX + (board.position.col * 32 * scaleFactor);
    const boardStartY = imageStartY + (board.position.row * 32 * scaleFactor);
    
    board.pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        ctx.fillStyle = color;
        ctx.fillRect(
          boardStartX + (x * scaleFactor),
          boardStartY + (y * scaleFactor),
          scaleFactor,
          scaleFactor
        );
      });
    });
  });
  
  // Draw border around image
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(imageStartX, imageStartY, imageWidth, imageHeight);
  
  // Draw complete colour list below the image
  const colourListStartY = imageStartY + imageHeight + 50;
  
  ctx.fillStyle = '#000000'; // Ensure black text
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('COMPLETE COLOUR LIST', canvas.width / 2, colourListStartY);
  
  ctx.font = '14px Arial';
  ctx.fillText('(Total pieces needed for entire project)', canvas.width / 2, colourListStartY + 30);
  
  // Draw colour items in a grid layout (4 columns)
  const colsPerRow = 4;
  const itemWidth = (canvas.width - padding * 2) / colsPerRow;
  const itemHeight = 45;
  let currentRow = 0;
  
  sortedColors.forEach((color, index) => {
    if (index >= colorSymbols.length) return;
    
    const col = index % colsPerRow;
    const row = Math.floor(index / colsPerRow);
    const itemX = padding + (col * itemWidth);
    const itemY = colourListStartY + 60 + (row * itemHeight);
    
    // Draw colour swatch
    ctx.fillStyle = color.hex;
    ctx.fillRect(itemX, itemY, 30, 30);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(itemX, itemY, 30, 30);
    
    // Draw symbol
    ctx.fillStyle = getContrastColor(color.hex);
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(colorSymbols[index], itemX + 15, itemY + 20);
    
    // Draw colour info
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${color.count} pieces`, itemX + 40, itemY + 12);
    
    ctx.font = '11px Arial';
    ctx.fillText(color.name, itemX + 40, itemY + 26);
    
    currentRow = Math.max(currentRow, row);
  });
  
  // Add summary box at bottom
  const summaryY = colourListStartY + 60 + ((currentRow + 1) * itemHeight) + 30;
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(padding, summaryY, canvas.width - (padding * 2), 100);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, summaryY, canvas.width - (padding * 2), 100);
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('PROJECT SUMMARY:', padding + 15, summaryY + 25);
  
  ctx.font = '14px Arial';
  const totalPieces = colorMap.reduce((sum, color) => sum + color.count, 0);
  const uniqueColours = colorMap.length;
  
  ctx.fillText(`• Total pieces needed: ${totalPieces.toLocaleString()}`, padding + 15, summaryY + 50);
  ctx.fillText(`• Unique colours required: ${uniqueColours}`, padding + 15, summaryY + 70);
  ctx.fillText(`• Total boards: ${boards.length} (32×32 baseplates)`, padding + 300, summaryY + 50);
  ctx.fillText(`• Layout: ${totalRows}×${totalCols} board arrangement`, padding + 300, summaryY + 70);
  
  return canvas.toDataURL('image/png');
}
