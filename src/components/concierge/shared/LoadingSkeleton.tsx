// =============================================================================
// LOADING SKELETON - Shared loading state components
// =============================================================================

import { memo } from 'react';
import { Loader2 } from 'lucide-react';

// -----------------------------------------------------------------------------
// Base Skeleton Component
// -----------------------------------------------------------------------------

interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo(function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
});

// -----------------------------------------------------------------------------
// AR Preview Loading Skeleton
// -----------------------------------------------------------------------------

export const ARPreviewSkeleton = memo(function ARPreviewSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-32 h-3" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-4 bg-background/50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <Skeleton className="w-32 h-4 mx-auto" />
          </div>
        </div>

        {/* Controls panel */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/30 bg-background/95 p-4 space-y-6">
          {/* Body part selector skeleton */}
          <div className="space-y-2">
            <Skeleton className="w-20 h-3" />
            <div className="grid grid-cols-2 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          </div>

          {/* Slider skeletons */}
          <div className="space-y-4">
            <Skeleton className="w-16 h-3" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="w-20 h-3" />
                  <Skeleton className="w-10 h-3" />
                </div>
                <Skeleton className="w-full h-2" />
              </div>
            ))}
          </div>

          {/* Action buttons skeleton */}
          <div className="space-y-3 pt-4 border-t border-border/30">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-12" />
            <Skeleton className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Chat Message Skeleton
// -----------------------------------------------------------------------------

export const MessageSkeleton = memo(function MessageSkeleton({
  isUser = false,
}: {
  isUser?: boolean;
}) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? 'bg-primary/20' : 'bg-secondary'
        }`}
      >
        <div className="space-y-2">
          <Skeleton className="w-48 h-3" />
          <Skeleton className="w-36 h-3" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Card Flow Skeleton
// -----------------------------------------------------------------------------

export const CardFlowSkeleton = memo(function CardFlowSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-16 h-3" />
        </div>
        <Skeleton className="w-full h-1" />
      </div>

      {/* Question area */}
      <div className="text-center space-y-2 py-4">
        <Skeleton className="w-48 h-5 mx-auto" />
        <Skeleton className="w-32 h-3 mx-auto" />
      </div>

      {/* Options */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border/50 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-40 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Variant Selector Skeleton
// -----------------------------------------------------------------------------

export const VariantSelectorSkeleton = memo(function VariantSelectorSkeleton() {
  return (
    <div className="space-y-4">
      {/* Main image */}
      <Skeleton className="aspect-square rounded-lg" />

      {/* Score badges */}
      <div className="p-3 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-5" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="w-12 h-3" />
                <Skeleton className="w-8 h-3" />
              </div>
              <Skeleton className="w-full h-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-14 h-14 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton className="w-10 h-10" />
        <Skeleton className="w-10 h-10" />
        <Skeleton className="w-10 h-10" />
        <div className="flex-1" />
        <Skeleton className="w-24 h-10" />
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Session Timeline Skeleton
// -----------------------------------------------------------------------------

export const SessionTimelineSkeleton = memo(function SessionTimelineSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/20 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-48 h-3" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="w-12 h-6 ml-auto" />
            <Skeleton className="w-16 h-3 ml-auto" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <Skeleton className="w-8 h-8 rounded-full" />
              {i < 2 && <Skeleton className="w-0.5 h-12 my-1" />}
            </div>
            <div className="flex-1 p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
              <Skeleton className="w-full h-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card p-4 space-y-2">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-24 h-5" />
          <Skeleton className="w-16 h-3" />
        </div>
        <div className="bg-card p-4 space-y-2">
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-20 h-5" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>

      {/* Button */}
      <div className="p-4 border-t border-border">
        <Skeleton className="w-full h-12 rounded-lg" />
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Generic Centered Loader
// -----------------------------------------------------------------------------

interface CenteredLoaderProps {
  message?: string;
  className?: string;
}

export const CenteredLoader = memo(function CenteredLoader({
  message = 'Loading...',
  className = '',
}: CenteredLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default {
  Skeleton,
  ARPreviewSkeleton,
  MessageSkeleton,
  CardFlowSkeleton,
  VariantSelectorSkeleton,
  SessionTimelineSkeleton,
  CenteredLoader,
};
