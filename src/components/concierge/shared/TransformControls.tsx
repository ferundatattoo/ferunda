// =============================================================================
// TRANSFORM CONTROLS - Shared slider controls for AR transform manipulation
// =============================================================================

import { memo } from 'react';
import { ZoomIn, RotateCw, Move } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { TattooTransform } from '@/types/concierge';
import { TRANSFORM_LIMITS } from '../constants';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TransformControlsProps {
  transform: TattooTransform;
  onChange: (transform: TattooTransform) => void;
  showPosition?: boolean;
  disabled?: boolean;
  className?: string;
  labels?: {
    scale?: string;
    rotation?: string;
    opacity?: string;
    positionX?: string;
    positionY?: string;
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const TransformControls = memo(function TransformControls({
  transform,
  onChange,
  showPosition = false,
  disabled = false,
  className = '',
  labels = {},
}: TransformControlsProps) {
  const {
    scale: scaleLabel = 'Size',
    rotation: rotationLabel = 'Rotation',
    opacity: opacityLabel = 'Opacity',
    positionX: positionXLabel = 'Position X',
    positionY: positionYLabel = 'Position Y',
  } = labels;

  const handleChange = (key: keyof TattooTransform, value: number) => {
    onChange({ ...transform, [key]: value });
  };

  return (
    <div className={`space-y-4 ${className}`} role="group" aria-label="Transform controls">
      {/* Scale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="transform-scale"
            className="text-sm text-muted-foreground flex items-center gap-2"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
            {scaleLabel}
          </Label>
          <span className="text-xs text-muted-foreground font-mono" aria-live="polite">
            {Math.round(transform.scale * 100)}%
          </span>
        </div>
        <Slider
          id="transform-scale"
          value={[transform.scale]}
          min={TRANSFORM_LIMITS.scale.min}
          max={TRANSFORM_LIMITS.scale.max}
          step={TRANSFORM_LIMITS.scale.step}
          onValueChange={([v]) => handleChange('scale', v)}
          disabled={disabled}
          aria-label={`${scaleLabel}: ${Math.round(transform.scale * 100)}%`}
        />
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="transform-rotation"
            className="text-sm text-muted-foreground flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" aria-hidden="true" />
            {rotationLabel}
          </Label>
          <span className="text-xs text-muted-foreground font-mono" aria-live="polite">
            {transform.rotation}°
          </span>
        </div>
        <Slider
          id="transform-rotation"
          value={[transform.rotation]}
          min={TRANSFORM_LIMITS.rotation.min}
          max={TRANSFORM_LIMITS.rotation.max}
          step={TRANSFORM_LIMITS.rotation.step}
          onValueChange={([v]) => handleChange('rotation', v)}
          disabled={disabled}
          aria-label={`${rotationLabel}: ${transform.rotation} degrees`}
        />
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="transform-opacity" className="text-sm text-muted-foreground">
            {opacityLabel}
          </Label>
          <span className="text-xs text-muted-foreground font-mono" aria-live="polite">
            {Math.round(transform.opacity * 100)}%
          </span>
        </div>
        <Slider
          id="transform-opacity"
          value={[transform.opacity]}
          min={TRANSFORM_LIMITS.opacity.min}
          max={TRANSFORM_LIMITS.opacity.max}
          step={TRANSFORM_LIMITS.opacity.step}
          onValueChange={([v]) => handleChange('opacity', v)}
          disabled={disabled}
          aria-label={`${opacityLabel}: ${Math.round(transform.opacity * 100)}%`}
        />
      </div>

      {/* Position Controls (optional) */}
      {showPosition && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="transform-offset-x"
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <Move className="w-4 h-4" aria-hidden="true" />
                {positionXLabel}
              </Label>
              <span className="text-xs text-muted-foreground font-mono" aria-live="polite">
                {transform.offsetX}px
              </span>
            </div>
            <Slider
              id="transform-offset-x"
              value={[transform.offsetX]}
              min={TRANSFORM_LIMITS.offset.min}
              max={TRANSFORM_LIMITS.offset.max}
              step={TRANSFORM_LIMITS.offset.step}
              onValueChange={([v]) => handleChange('offsetX', v)}
              disabled={disabled}
              aria-label={`${positionXLabel}: ${transform.offsetX} pixels`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="transform-offset-y" className="text-sm text-muted-foreground">
                {positionYLabel}
              </Label>
              <span className="text-xs text-muted-foreground font-mono" aria-live="polite">
                {transform.offsetY}px
              </span>
            </div>
            <Slider
              id="transform-offset-y"
              value={[transform.offsetY]}
              min={TRANSFORM_LIMITS.offset.min}
              max={TRANSFORM_LIMITS.offset.max}
              step={TRANSFORM_LIMITS.offset.step}
              onValueChange={([v]) => handleChange('offsetY', v)}
              disabled={disabled}
              aria-label={`${positionYLabel}: ${transform.offsetY} pixels`}
            />
          </div>
        </>
      )}
    </div>
  );
});

export default TransformControls;
