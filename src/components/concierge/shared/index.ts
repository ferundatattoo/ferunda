// =============================================================================
// SHARED COMPONENTS - Export all shared UI components
// =============================================================================

export { TransformControls } from './TransformControls';
export type { TransformControlsProps } from './TransformControls';

export { FeedbackButtons } from './FeedbackButtons';
export type { FeedbackButtonsProps } from './FeedbackButtons';

export { ImageUploader } from './ImageUploader';
export type { ImageUploaderProps } from './ImageUploader';

export {
  Skeleton,
  ARPreviewSkeleton,
  MessageSkeleton,
  CardFlowSkeleton,
  VariantSelectorSkeleton,
  SessionTimelineSkeleton,
  CenteredLoader,
} from './LoadingSkeleton';

export {
  ConciergeErrorBoundary,
  ErrorFallback,
  ARErrorFallback,
  withErrorBoundary,
} from './ErrorBoundary';

export {
  EmptyState,
  NoVariantsEmptyState,
  NoMessagesEmptyState,
  NoAvailabilityEmptyState,
  NoReferencesEmptyState,
} from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export {
  ConfirmDialog,
  RejectDesignDialog,
  CloseSessionDialog,
  SubmitBookingDialog,
  useConfirm,
} from './ConfirmDialog';
export type { ConfirmDialogProps, UseConfirmOptions } from './ConfirmDialog';
