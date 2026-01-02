/**
 * Image Compression Utility - Client-side resize/compress before upload
 * Safe implementation with fallback to original if compression fails
 */

export interface CompressionOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidthOrHeight: 2048,
  maxSizeMB: 2,
  quality: 0.85,
};

/**
 * Compress an image file using canvas
 * Returns compressed blob or original file if compression fails/unnecessary
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; wasCompressed: boolean; originalSize: number; finalSize: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Skip compression for small files
  const maxBytes = (opts.maxSizeMB || 2) * 1024 * 1024;
  if (originalSize <= maxBytes * 0.8) {
    return { blob: file, wasCompressed: false, originalSize, finalSize: originalSize };
  }

  try {
    // Load image
    const img = await loadImage(file);
    
    // Calculate new dimensions
    let { width, height } = img;
    const maxDim = opts.maxWidthOrHeight || 2048;
    
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Create canvas and draw
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Draw with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const blob = await canvasToBlob(canvas, file.type, opts.quality || 0.85);
    
    // If compressed is larger, return original
    if (blob.size >= originalSize) {
      return { blob: file, wasCompressed: false, originalSize, finalSize: originalSize };
    }

    return { blob, wasCompressed: true, originalSize, finalSize: blob.size };
  } catch (error) {
    console.warn('[imageCompression] Compression failed, using original:', error);
    return { blob: file, wasCompressed: false, originalSize, finalSize: originalSize };
  }
}

/**
 * Load an image from a File
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Convert canvas to blob with quality
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type === 'image/png' ? 'image/png' : 'image/jpeg',
      quality
    );
  });
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Check if file type is supported
 */
export function isImageTypeSupported(file: File): boolean {
  const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return supported.includes(file.type);
}

/**
 * Get Spanish error message for upload issues
 */
export function getUploadErrorMessage(error: string, lang: 'es' | 'en' = 'es'): string {
  const messages: Record<string, { es: string; en: string }> = {
    'size': {
      es: 'Imagen demasiado grande – comprimiendo automáticamente',
      en: 'Image too large – compressing automatically'
    },
    'format': {
      es: 'Formato no soportado. Usa JPG, PNG o WebP',
      en: 'Unsupported format. Use JPG, PNG, or WebP'
    },
    'upload_failed': {
      es: 'Error al subir imagen. Intenta de nuevo',
      en: 'Failed to upload image. Try again'
    },
    'compressing': {
      es: 'Comprimiendo imagen...',
      en: 'Compressing image...'
    },
    'success': {
      es: 'Imagen subida correctamente',
      en: 'Image uploaded successfully'
    }
  };

  return messages[error]?.[lang] || messages[error]?.['es'] || error;
}
