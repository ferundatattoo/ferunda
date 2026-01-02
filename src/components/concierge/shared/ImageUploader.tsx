// =============================================================================
// IMAGE UPLOADER - Shared image upload component with preview
// =============================================================================

import { memo, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useImageUpload } from '../hooks/useImageUpload';
import type { UploadedImage } from '@/types/concierge';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ImageUploaderProps {
  onUpload: (images: UploadedImage[]) => void;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
  showProgress?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'dropzone';
  labels?: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    maxFilesError?: string;
  };
}

// -----------------------------------------------------------------------------
// Image Preview Component
// -----------------------------------------------------------------------------

interface ImagePreviewProps {
  image: UploadedImage;
  index: number;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const ImagePreview = memo(function ImagePreview({
  image,
  index,
  onRemove,
  disabled,
}: ImagePreviewProps) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden group">
      <img
        src={image.preview}
        alt={`Upload ${index + 1}`}
        className="w-full h-full object-cover"
      />
      <button
        onClick={() => onRemove(index)}
        disabled={disabled}
        className="absolute top-1 right-1 p-1 bg-destructive/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50"
        aria-label={`Remove image ${index + 1}`}
      >
        <X className="w-3 h-3 text-white" aria-hidden="true" />
      </button>
      {/* Type badge */}
      <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-background/80 rounded text-muted-foreground">
        {image.type === 'placement_photo' ? 'Placement' : 'Reference'}
      </span>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export const ImageUploader = memo(function ImageUploader({
  onUpload,
  maxFiles = 5,
  accept,
  disabled = false,
  showProgress = true,
  className = '',
  variant = 'default',
  labels = {},
}: ImageUploaderProps) {
  const {
    title = 'Upload images',
    subtitle = 'PNG, JPG up to 10MB',
    buttonText = 'Upload',
    maxFilesError = 'Maximum images reached',
  } = labels;

  const {
    images,
    isCompressing,
    progress,
    error,
    handleFileSelect,
    removeImage,
    clearError,
    inputRef,
    canAddMore,
    remainingSlots,
    acceptString,
  } = useImageUpload({
    maxFiles,
    onUploadComplete: onUpload,
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || !canAddMore) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    [disabled, canAddMore, handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept || acceptString}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || !canAddMore}
          aria-label="Upload images"
        />

        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <ImagePreview key={i} image={img} index={i} onRemove={removeImage} disabled={disabled} />
          ))}

          {canAddMore && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="w-16 h-16 flex-shrink-0 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center hover:border-primary/50 transition-colors disabled:opacity-50"
              aria-label="Add more images"
            >
              {isCompressing ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Dropzone variant
  if (variant === 'dropzone') {
    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept || acceptString}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || !canAddMore}
          aria-label="Upload images"
        />

        {/* Error alert */}
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <button onClick={clearError} className="text-xs underline">
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => canAddMore && inputRef.current?.click()}
          className={`
            relative p-8 border-2 border-dashed rounded-xl text-center transition-colors
            ${canAddMore ? 'cursor-pointer hover:border-primary/50 border-border/50' : 'border-muted cursor-not-allowed'}
            ${disabled ? 'opacity-50' : ''}
          `}
          role="button"
          tabIndex={canAddMore ? 0 : -1}
          onKeyDown={(e) => e.key === 'Enter' && canAddMore && inputRef.current?.click()}
          aria-label={canAddMore ? 'Click or drag to upload images' : maxFilesError}
        >
          {isCompressing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Compressing...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              {!canAddMore && (
                <p className="text-xs text-amber-500 mt-2">{maxFilesError}</p>
              )}
            </>
          )}

          {/* Progress bar */}
          {showProgress && progress > 0 && progress < 100 && (
            <div className="mt-4">
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {images.map((img, i) => (
              <ImagePreview
                key={i}
                image={img}
                index={i}
                onRemove={removeImage}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept || acceptString}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || !canAddMore}
        aria-label="Upload images"
      />

      {/* Error alert */}
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            <button onClick={clearError} className="text-xs underline">
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload area */}
      <label
        className={`
          flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl
          ${canAddMore ? 'cursor-pointer hover:border-primary/50 border-border/50' : 'border-muted cursor-not-allowed'}
          ${disabled ? 'opacity-50' : ''}
          bg-card/30 transition-colors
        `}
      >
        <input
          type="file"
          multiple
          accept={accept || acceptString}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || !canAddMore}
        />

        {isCompressing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <span className="text-sm text-muted-foreground">Compressing...</span>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground mb-2" aria-hidden="true" />
            <span className="text-sm font-medium">{title}</span>
            <span className="text-xs text-muted-foreground mt-1">{subtitle}</span>
            {remainingSlots > 0 && remainingSlots < maxFiles && (
              <span className="text-xs text-muted-foreground mt-1">
                {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
              </span>
            )}
          </>
        )}
      </label>

      {/* Progress bar */}
      {showProgress && progress > 0 && progress < 100 && (
        <div className="mt-2">
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {images.map((img, i) => (
            <ImagePreview key={i} image={img} index={i} onRemove={removeImage} disabled={disabled} />
          ))}
        </div>
      )}
    </div>
  );
});

export default ImageUploader;
