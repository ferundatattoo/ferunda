// =============================================================================
// EMPTY STATE - Shared empty state component with guidance
// =============================================================================

import { memo, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact' | 'centered';
  className?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const EmptyState = memo(function EmptyState({
  icon: IconProp,
  title,
  description,
  action,
  actionLabel,
  onAction,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  // Determine icon rendering
  const renderIcon = () => {
    if (!IconProp) {
      return (
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
        </div>
      );
    }

    // If it's a LucideIcon component
    if (typeof IconProp === 'function') {
      const Icon = IconProp as LucideIcon;
      return (
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
        </div>
      );
    }

    // If it's already a ReactNode
    return <div className="mb-4">{IconProp}</div>;
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 p-4 ${className}`}>
        {IconProp &&
          (typeof IconProp === 'function' ? (
            <IconProp className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          ) : (
            IconProp
          ))}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {(action || (actionLabel && onAction)) && (
          <div className="flex-shrink-0">
            {action || (
              <Button onClick={onAction} variant="outline" size="sm">
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Centered variant (full-page style)
  if (variant === 'centered') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[300px] p-8 ${className}`}>
        {renderIcon()}
        <h3 className="text-lg font-semibold text-foreground mb-2 text-center">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{description}</p>
        )}
        {(action || (actionLabel && onAction)) && (
          <div>
            {action || (
              <Button onClick={onAction} variant="default">
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-8 px-4 rounded-xl border border-dashed border-border/50 ${className}`}
    >
      {renderIcon()}
      <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {(action || (actionLabel && onAction)) && (
        <div>
          {action || (
            <Button onClick={onAction} variant="outline" size="sm">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

// -----------------------------------------------------------------------------
// Preset Empty States
// -----------------------------------------------------------------------------

export const NoVariantsEmptyState = memo(function NoVariantsEmptyState({
  onAddDetails,
}: {
  onAddDetails?: () => void;
}) {
  return (
    <EmptyState
      icon={Sparkles}
      title="No designs yet"
      description="Share more about your vision to generate concept sketches"
      actionLabel="Add Details"
      onAction={onAddDetails}
    />
  );
});

export const NoMessagesEmptyState = memo(function NoMessagesEmptyState({
  onStartChat,
}: {
  onStartChat?: () => void;
}) {
  return (
    <EmptyState
      variant="centered"
      title="Start a conversation"
      description="Tell me about the tattoo you're dreaming of"
      actionLabel="Let's begin"
      onAction={onStartChat}
    />
  );
});

export const NoAvailabilityEmptyState = memo(function NoAvailabilityEmptyState({
  onContinue,
}: {
  onContinue?: () => void;
}) {
  return (
    <EmptyState
      title="No available dates"
      description="No upcoming availability found. You can still submit your request and we'll contact you when spots open up."
      actionLabel="Continue anyway"
      onAction={onContinue}
    />
  );
});

export const NoReferencesEmptyState = memo(function NoReferencesEmptyState({
  onUpload,
}: {
  onUpload?: () => void;
}) {
  return (
    <EmptyState
      variant="compact"
      title="No reference images"
      description="Adding references helps us understand your vision"
      actionLabel="Upload"
      onAction={onUpload}
    />
  );
});

// -----------------------------------------------------------------------------
// Export default
// -----------------------------------------------------------------------------

export default EmptyState;
