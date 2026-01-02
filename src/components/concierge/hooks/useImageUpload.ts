// =============================================================================
// USE IMAGE UPLOAD HOOK - Shared image upload logic with compression
// =============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UploadedImage } from '@/types/concierge';
import { IMAGE_UPLOAD_CONFIG } from '../constants';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseImageUploadOptions {
  maxFiles?: number;
  maxSizeMB?: number;
  compressThresholdMB?: number;
  compressTargetMB?: number;
  compressQuality?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (images: UploadedImage[]) => void;
  onUploadError?: (error: ImageUploadError) => void;
}

export interface UseImageUploadReturn {
  // State
  images: UploadedImage[];
  isCompressing: boolean;
  progress: number;
  error: ImageUploadError | null;

  // Actions
  handleFileSelect: (
    files: FileList | File[],
    type?: 'reference_image' | 'placement_photo'
  ) => Promise<void>;
  removeImage: (index: number) => void;
  clearImages: () => void;
  clearError: () => void;

  // Refs
  inputRef: React.RefObject<HTMLInputElement>;

  // Helpers
  canAddMore: boolean;
  remainingSlots: number;
  acceptString: string;
}

export interface ImageUploadError {
  code: 'MAX_FILES' | 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'COMPRESSION_FAILED' | 'UPLOAD_FAILED';
  message: string;
  details?: string;
}

// -----------------------------------------------------------------------------
// Image Compression Utilities
// -----------------------------------------------------------------------------

async function compressImage(
  file: File,
  options: {
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
    quality?: number;
  }
): Promise<{ blob: Blob; wasCompressed: boolean; originalSize: number; finalSize: number }> {
  const { maxWidthOrHeight = 2048, maxSizeMB = 2, quality = 0.85 } = options;

  const originalSize = file.size;

  // If already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return { blob: file, wasCompressed: false, originalSize, finalSize: file.size };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        if (width > height) {
          height = (height / width) * maxWidthOrHeight;
          width = maxWidthOrHeight;
        } else {
          width = (width / height) * maxWidthOrHeight;
          height = maxWidthOrHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          resolve({
            blob,
            wasCompressed: true,
            originalSize,
            finalSize: blob.size,
          });

          // Cleanup
          URL.revokeObjectURL(img.src);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = URL.createObjectURL(file);
  });
}

function isImageTypeSupported(file: File, acceptedTypes: string[]): boolean {
  return acceptedTypes.includes(file.type);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    maxFiles = IMAGE_UPLOAD_CONFIG.maxFiles,
    maxSizeMB = IMAGE_UPLOAD_CONFIG.maxSizeMB,
    compressThresholdMB = IMAGE_UPLOAD_CONFIG.compressThresholdMB,
    compressTargetMB = IMAGE_UPLOAD_CONFIG.compressTargetMB,
    compressQuality = IMAGE_UPLOAD_CONFIG.compressQuality,
    acceptedTypes = IMAGE_UPLOAD_CONFIG.acceptedTypes,
    onUploadComplete,
    onUploadError,
  } = options;

  // State
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ImageUploadError | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (
      files: FileList | File[],
      type: 'reference_image' | 'placement_photo' = 'reference_image'
    ): Promise<void> => {
      const fileArray = Array.from(files);
      const remaining = maxFiles - images.length;

      // Check if can add more
      if (remaining <= 0) {
        const uploadError: ImageUploadError = {
          code: 'MAX_FILES',
          message: `Maximum ${maxFiles} images allowed`,
        };
        setError(uploadError);
        onUploadError?.(uploadError);
        return;
      }

      const filesToProcess = fileArray.slice(0, remaining);
      const processedImages: UploadedImage[] = [];
      let processedCount = 0;

      setProgress(0);
      setError(null);

      for (const file of filesToProcess) {
        // Validate type
        if (!isImageTypeSupported(file, acceptedTypes)) {
          const uploadError: ImageUploadError = {
            code: 'INVALID_TYPE',
            message: 'Invalid file type',
            details: `Accepted types: ${acceptedTypes.join(', ')}`,
          };
          setError(uploadError);
          onUploadError?.(uploadError);
          continue;
        }

        let processedFile = file;

        // Compress if needed
        if (file.size > compressThresholdMB * 1024 * 1024) {
          setIsCompressing(true);

          try {
            const result = await compressImage(file, {
              maxWidthOrHeight: IMAGE_UPLOAD_CONFIG.compressMaxDimension,
              maxSizeMB: compressTargetMB,
              quality: compressQuality,
            });

            if (result.wasCompressed) {
              processedFile = new File([result.blob], file.name, {
                type: result.blob.type,
              });
              console.log(
                `[useImageUpload] Compressed: ${formatBytes(result.originalSize)} → ${formatBytes(result.finalSize)}`
              );
            }
          } catch (err) {
            console.warn('[useImageUpload] Compression failed:', err);
            // Continue with original file
          } finally {
            setIsCompressing(false);
          }
        }

        // Final size check
        if (processedFile.size > maxSizeMB * 1024 * 1024) {
          const uploadError: ImageUploadError = {
            code: 'FILE_TOO_LARGE',
            message: 'File too large',
            details: `Maximum ${maxSizeMB}MB. Your file: ${formatBytes(processedFile.size)}`,
          };
          setError(uploadError);
          onUploadError?.(uploadError);
          continue;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(processedFile);
        objectUrlsRef.current.push(previewUrl);

        processedImages.push({
          file: processedFile,
          preview: previewUrl,
          type,
        });

        processedCount++;
        setProgress(Math.round((processedCount / filesToProcess.length) * 100));
      }

      if (processedImages.length > 0) {
        setImages((prev) => [...prev, ...processedImages]);
        onUploadComplete?.(processedImages);
      }

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      setProgress(0);
    },
    [
      images.length,
      maxFiles,
      acceptedTypes,
      compressThresholdMB,
      compressTargetMB,
      compressQuality,
      maxSizeMB,
      onUploadComplete,
      onUploadError,
    ]
  );

  // Remove image by index
  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      const removed = newImages.splice(index, 1)[0];

      // Revoke object URL
      if (removed) {
        URL.revokeObjectURL(removed.preview);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== removed.preview);
      }

      return newImages;
    });
  }, []);

  // Clear all images
  const clearImages = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    objectUrlsRef.current = [];
    setImages([]);
    setProgress(0);
    setError(null);
  }, [images]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    images,
    isCompressing,
    progress,
    error,
    handleFileSelect,
    removeImage,
    clearImages,
    clearError,
    inputRef,
    canAddMore: images.length < maxFiles,
    remainingSlots: maxFiles - images.length,
    acceptString: acceptedTypes.join(','),
  };
}

export default useImageUpload;
