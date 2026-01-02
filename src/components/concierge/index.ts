// =============================================================================
// CONCIERGE MODULE - Main exports
// =============================================================================

// -----------------------------------------------------------------------------
// Context & State Management
// -----------------------------------------------------------------------------

export {
  ConciergeProvider,
  useConcierge,
  useConciergeSession,
  useConciergeMessages,
  useConciergeAR,
  useConciergeUploads,
  useConciergeVariants,
} from './context/ConciergeContext';
export type { ConciergeState } from './context/ConciergeContext';

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

export {
  useARCanvas,
  useCamera,
  useMediaPipe,
  useImageUpload,
} from './hooks';

// -----------------------------------------------------------------------------
// AR Components
// -----------------------------------------------------------------------------

export { ARPreview } from './ar';

// -----------------------------------------------------------------------------
// Shared Components
// -----------------------------------------------------------------------------

export {
  // Transform & Feedback
  TransformControls,
  FeedbackButtons,
  
  // Image Upload
  ImageUploader,
  
  // Loading States
  Skeleton,
  ARPreviewSkeleton,
  MessageSkeleton,
  CardFlowSkeleton,
  VariantSelectorSkeleton,
  SessionTimelineSkeleton,
  CenteredLoader,
  
  // Error Handling
  ConciergeErrorBoundary,
  ErrorFallback,
  ARErrorFallback,
  withErrorBoundary,
  
  // Empty States
  EmptyState,
  NoVariantsEmptyState,
  NoMessagesEmptyState,
  NoAvailabilityEmptyState,
  NoReferencesEmptyState,
  
  // Dialogs
  ConfirmDialog,
  RejectDesignDialog,
  CloseSessionDialog,
  SubmitBookingDialog,
  useConfirm,
} from './shared';

export type {
  TransformControlsProps,
  FeedbackButtonsProps,
  ImageUploaderProps,
  EmptyStateProps,
  ConfirmDialogProps,
  UseConfirmOptions,
} from './shared';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export {
  BODY_PART_CONFIG,
  BODY_PART_OPTIONS,
  TRANSFORM_LIMITS,
  IMAGE_UPLOAD_CONFIG,
  ANIMATION_VARIANTS,
} from './constants';

// -----------------------------------------------------------------------------
// Existing Components
// -----------------------------------------------------------------------------

export { default as CardFlowConcierge } from './CardFlowConcierge';
export { default as ConciergeEntry } from './ConciergeEntry';
