// =============================================================================
// CONCIERGE TYPES - Centralized type definitions for concierge system
// =============================================================================

// -----------------------------------------------------------------------------
// Body Parts & Transform
// -----------------------------------------------------------------------------

export type BodyPart =
  | 'left_wrist'
  | 'right_wrist'
  | 'left_inner_forearm'
  | 'right_inner_forearm'
  | 'left_outer_forearm'
  | 'right_outer_forearm'
  | 'left_bicep'
  | 'right_bicep'
  | 'chest_center'
  | 'stomach'
  | 'upper_back'
  | 'lower_back'
  | 'left_thigh_front'
  | 'right_thigh_front'
  | 'left_calf'
  | 'right_calf';

export interface TattooTransform {
  scale: number;
  rotation: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_TRANSFORM: TattooTransform = {
  scale: 1,
  rotation: 0,
  opacity: 0.85,
  offsetX: 0,
  offsetY: 0,
};

// -----------------------------------------------------------------------------
// MediaPipe Types
// -----------------------------------------------------------------------------

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface MediaPipePose {
  setOptions: (options: MediaPipePoseOptions) => void;
  onResults: (callback: (results: { poseLandmarks?: LandmarkPoint[] }) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
}

export interface MediaPipePoseOptions {
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

// Note: Window.Pose is declared in ARTattooPreview.tsx
// We use the MediaPipePose interface for type safety in our hooks

// -----------------------------------------------------------------------------
// Feedback & Actions
// -----------------------------------------------------------------------------

export type FeedbackReaction = 'love' | 'refine';

export type SessionStage =
  | 'intro'
  | 'gathering'
  | 'generating'
  | 'preview_ready'
  | 'refinement'
  | 'scheduling'
  | 'deposit'
  | 'confirmed';

// -----------------------------------------------------------------------------
// Session & Brief
// -----------------------------------------------------------------------------

export interface ConciergeSession {
  id: string;
  fingerprint: string;
  stage: SessionStage;
  readinessScore: number;
  designBriefJson?: DesignBrief;
  createdAt: string;
  updatedAt: string;
}

export interface DesignBrief {
  style?: string;
  placementZone?: string;
  sizeCategory?: 'tiny' | 'small' | 'medium' | 'large' | 'extra_large';
  colorScheme?: 'black_grey' | 'color' | 'mixed';
  description?: string;
  meaningNotes?: string;
  referenceUrls?: string[];
  isSleeve?: boolean;
  isCustomOnly?: boolean;
}

// -----------------------------------------------------------------------------
// Messages
// -----------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'image' | 'sketch' | 'ar_preview' | 'calendar' | 'payment';
  url?: string;
  data?: unknown;
  label?: string;
}

// -----------------------------------------------------------------------------
// Variants & Feasibility
// -----------------------------------------------------------------------------

export interface ConceptVariant {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  scores: {
    style: number;
    placement: number;
    size: number;
    overall: number;
  };
  description?: string;
  createdAt: string;
}

export interface FeasibilityResult {
  feasible: boolean;
  score: number;
  concerns: string[];
  recommendations: string[];
  estimatedSessions?: number;
  estimatedDuration?: string;
}

// -----------------------------------------------------------------------------
// Pre-Gate
// -----------------------------------------------------------------------------

export interface PreGateResult {
  passed: boolean;
  questions: PreGateQuestion[];
  summary?: string;
}

export interface PreGateQuestion {
  id: string;
  question: string;
  answer?: string;
  required: boolean;
}

// -----------------------------------------------------------------------------
// Action Cards
// -----------------------------------------------------------------------------

export interface ActionCard {
  id: string;
  type: 'option' | 'info' | 'action';
  icon?: string;
  title: string;
  description?: string;
  action?: () => void;
  disabled?: boolean;
}

// -----------------------------------------------------------------------------
// Uploads
// -----------------------------------------------------------------------------

export interface UploadedImage {
  file: File;
  preview: string;
  type: 'reference_image' | 'placement_photo';
  uploadedUrl?: string;
}

// -----------------------------------------------------------------------------
// AR Preview Props
// -----------------------------------------------------------------------------

export interface ARPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  referenceImageUrl: string;
  onBookingClick?: () => void;
  onCapture?: (imageUrl: string) => void;
  onFeedback?: (feedback: FeedbackReaction, screenshotUrl?: string) => void;
  suggestedBodyPart?: string;
  mode?: 'quick' | 'tracking';
}
