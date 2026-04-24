import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with static path
// The worker will be automatically available after npm install
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Process uploaded files (images, PDFs, or text) into image blobs
 * @param {FileList|File[]} files - The uploaded files
 * @returns {Promise<Array>} - Array of { blob: Blob, type: 'image'|'pdf'|'text', name: string, pageNum?: number, text?: string }
 */
export async function processFiles(files) {
  const filesArray = Array.isArray(files) ? files : Array.from(files);
  const results = [];
  
  for (const file of filesArray) {
    if (file.type.startsWith('image/')) {
      // Direct image file - no processing needed
      results.push({
        blob: file,
        type: 'image',
        name: file.name
      });
      
    } else if (file.type === 'application/pdf') {
      // Convert PDF pages to images
      try {
        const pdfImages = await convertPdfToImages(file);
        results.push(...pdfImages);
      } catch (error) {
        console.error(`Failed to process PDF "${file.name}":`, error);
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      // Handle text files
      try {
        const textContent = await file.text();
        results.push({
          blob: new Blob([textContent], { type: 'text/plain' }),
          type: 'text',
          name: file.name,
          text: textContent
        });
      } catch (error) {
        console.error(`Failed to process text file "${file.name}":`, error);
        throw new Error(`Text file processing failed: ${error.message}`);
      }
    } else {
      console.warn(`Unsupported file type: ${file.type} for file "${file.name}"`);
    }
  }
    
  return results;
}

/**
 * Convert PDF to array of image blobs (one per page)
 * @param {File} pdfFile - PDF file
 * @returns {Promise<Array>} - Array of processed page objects
 */
async function convertPdfToImages(pdfFile) {
  // Read PDF file as ArrayBuffer
  const arrayBuffer = await pdfFile.arrayBuffer();
  
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    // Disable font loading to speed up rendering
    disableFontFace: false,
    // Enable text content for better extraction quality
    enableXfa: true
  });
  
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const images = [];
  
  console.log(`📄 Processing PDF: ${numPages} page(s) from "${pdfFile.name}"`);
  
  // Process each page sequentially
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      
      // Get viewport at 2x scale for better quality
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { 
        alpha: false  // Opaque canvas for smaller file size
      });
      
      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
      images.push({
        blob: blob,
        type: 'image',
        name: `${pdfFile.name} - Page ${pageNum}`,
        pageNum: pageNum
      });
      
      console.log(`✅ Converted page ${pageNum} to image`);
      
    } catch (error) {
      console.error(`Failed to process page ${pageNum}:`, error);
      throw new Error(`Failed to process page ${pageNum}: ${error.message}`);
    }
  }
  
  return images;
}

/**
 * Create preview URL for an image blob
 * @param {Blob} blob - Image blob
 * @returns {string} - Preview URL
 */
export function createPreviewURL(blob) {
  return URL.createObjectURL(blob);
}

/**
 * Revoke preview URL to free memory
 * @param {string} url - Preview URL to revoke
 */
export function revokePreviewURL(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
