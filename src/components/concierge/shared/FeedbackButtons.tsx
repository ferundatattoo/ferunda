// =============================================================================
// FEEDBACK BUTTONS - Shared feedback action buttons for AR/design flows
// =============================================================================

import { memo } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedbackReaction } from '@/types/concierge';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FeedbackButtonsProps {
  onFeedback: (reaction: FeedbackReaction, screenshotUrl?: string) => void;
  captureScreenshot?: () => string | undefined;
  variant?: 'default' | 'compact' | 'inline';
  onClose?: () => void;
  onBookingClick?: () => void;
  disabled?: boolean;
  className?: string;
  labels?: {
    love?: string;
    refine?: string;
    book?: string;
    back?: string;
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const FeedbackButtons = memo(function FeedbackButtons({
  onFeedback,
  captureScreenshot,
  variant = 'default',
  onClose,
  onBookingClick,
  disabled = false,
  className = '',
  labels = {},
}: FeedbackButtonsProps) {
  const {
    love: loveLabel = '❤️ Love it!',
    refine: refineLabel = '🔄 Refine',
    book: bookLabel = 'Book now!',
    back: backLabel = 'Back to chat',
  } = labels;

  const handleLove = () => {
    const screenshot = captureScreenshot?.();
    onFeedback('love', screenshot);
  };

  const handleRefine = () => {
    const screenshot = captureScreenshot?.();
    onFeedback('refine', screenshot);
    onClose?.();
  };

  const handleBook = () => {
    onBookingClick?.();
    onClose?.();
  };

  // Compact variant - just the feedback buttons
  if (variant === 'compact') {
    return (
      <div className={`flex gap-2 ${className}`} role="group" aria-label="Feedback options">
        <Button
          onClick={handleLove}
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-green-500/50 text-green-400 hover:bg-green-500/20 focus:ring-green-500/50"
          aria-label="I love this design"
        >
          ❤️
        </Button>
        <Button
          onClick={handleRefine}
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20 focus:ring-amber-500/50"
          aria-label="I want to refine this design"
        >
          🔄
        </Button>
      </div>
    );
  }

  // Inline variant - horizontal layout
  if (variant === 'inline') {
    return (
      <div className={`flex gap-2 ${className}`} role="group" aria-label="Feedback options">
        <Button
          onClick={handleLove}
          variant="outline"
          disabled={disabled}
          className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/20 focus:ring-green-500/50"
          aria-label="I love this design"
        >
          {loveLabel}
        </Button>
        <Button
          onClick={handleRefine}
          variant="outline"
          disabled={disabled}
          className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/20 focus:ring-amber-500/50"
          aria-label="I want to refine this design"
        >
          {refineLabel}
        </Button>
      </div>
    );
  }

  // Default variant - full layout with booking button
  return (
    <div
      className={`pt-4 border-t border-border/30 space-y-3 ${className}`}
      role="group"
      aria-label="Actions"
    >
      {/* Feedback buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleLove}
          variant="outline"
          disabled={disabled}
          className="border-green-500/50 text-green-400 hover:bg-green-500/20 focus:ring-green-500/50"
          aria-label="I love this design"
        >
          {loveLabel}
        </Button>
        <Button
          onClick={handleRefine}
          variant="outline"
          disabled={disabled}
          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20 focus:ring-amber-500/50"
          aria-label="I want to refine this design"
        >
          {refineLabel}
        </Button>
      </div>

      {/* Booking button */}
      {onBookingClick && (
        <Button
          onClick={handleBook}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="lg"
          disabled={disabled}
          aria-label="Proceed to booking"
        >
          <Check className="w-5 h-5 mr-2" aria-hidden="true" />
          {bookLabel}
        </Button>
      )}

      {/* Back button */}
      {onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full text-muted-foreground"
          size="sm"
          disabled={disabled}
          aria-label="Return to chat"
        >
          {backLabel}
        </Button>
      )}
    </div>
  );
});

export default FeedbackButtons;
