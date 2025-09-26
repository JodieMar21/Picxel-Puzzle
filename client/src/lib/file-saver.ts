// File saving utilities with proper "Save As" dialog functionality

export interface SaveFileOptions {
  suggestedName: string;
  fileExtension: string;
  mimeType: string;
  description: string;
}

export async function saveFileWithDialog(
  content: string | Blob, 
  options: SaveFileOptions
): Promise<boolean> {
  console.log('Starting save process for:', options.suggestedName);
  console.log('Browser supports File System Access API:', 'showSaveFilePicker' in window);
  console.log('Is secure context:', window.isSecureContext);
  
  try {
    // Always use the download fallback for now since File System Access API is problematic
    console.log('Using download fallback method');
    
    // Fallback method: Create a download that should trigger browser's save dialog
    const blob = typeof content === 'string' 
      ? new Blob([content], { type: options.mimeType })
      : content;
      
    console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
      
    const url = URL.createObjectURL(blob);
    console.log('Created object URL:', url);
    
    // Create a temporary download link with proper attributes
    const link = document.createElement('a');
    link.href = url;
    link.download = options.suggestedName;
    link.style.display = 'none';
    
    // For better browser compatibility, set additional attributes
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    
    console.log('Created download link with attributes:', {
      href: link.href,
      download: link.download,
      target: link.target
    });
    
    // Add to DOM and trigger click
    document.body.appendChild(link);
    console.log('Added link to DOM');
    
    // Trigger the download
    link.click();
    console.log('Triggered click on download link');
    
    // Clean up immediately
    document.body.removeChild(link);
    console.log('Removed link from DOM');
    
    // Clean up the URL after a short delay
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
        console.log('Cleaned up object URL');
      } catch (e) {
        console.log('URL cleanup error:', e);
      }
    }, 1000);
    
    console.log('Save process completed successfully');
    return true;
  } catch (error) {
    console.error('Save failed completely:', error);
    // Show user-friendly error message
    alert('Failed to save file. Please check your browser settings and try again.');
    return false;
  }
}

export async function saveImageWithDialog(
  imageDataUrl: string,
  suggestedName: string
): Promise<boolean> {
  try {
    // Convert data URL to blob manually for better compatibility
    const base64Data = imageDataUrl.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    return await saveFileWithDialog(blob, {
      suggestedName,
      fileExtension: '.png',
      mimeType: 'image/png',
      description: 'PNG Images'
    });
  } catch (error) {
    console.error('Error saving image:', error);
    alert('Failed to save image. Please try again.');
    return false;
  }
}

export async function saveProjectWithDialog(projectData: any): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(projectData, null, 2);
    const fileName = `picxel-project-${new Date().toISOString().split('T')[0]}.json`;
    
    const success = await saveFileWithDialog(jsonString, {
      suggestedName: fileName,
      fileExtension: '.json',
      mimeType: 'application/json',
      description: 'Picxel Project Files'
    });
    
    if (success) {
      // Optional: Show success message
      console.log('Project saved successfully');
    }
    
    return success;
  } catch (error) {
    console.error('Error saving project:', error);
    alert('Failed to save project. Please try again.');
    return false;
  }
}