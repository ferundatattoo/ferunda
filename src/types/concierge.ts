// =============================================================================
// CONCIERGE TYPES - Centralized type definitions
// =============================================================================

import type { LucideIcon } from 'lucide-react';

// -----------------------------------------------------------------------------
// Core Enums & Unions
// -----------------------------------------------------------------------------

export type SessionStage =
  | 'discovery'
  | 'brief_building'
  | 'design_alignment'
  | 'preview_ready'
  | 'scheduling'
  | 'deposit'
  | 'confirmed';

export type PlacementZone =
  | 'arm'
  | 'forearm'
  | 'wrist'
  | 'shoulder'
  | 'chest'
  | 'back'
  | 'ribs'
  | 'leg'
  | 'ankle'
  | 'neck'
  | 'hand'
  | 'other';

export type SizeCategory = 'small' | 'medium' | 'large' | 'xlarge';

export type ColorMode = 'blackgrey' | 'full_color' | 'single_accent';

export type ProjectType = 'new_tattoo' | 'coverup' | 'touchup';

export type StyleTag =
  | 'blackwork'
  | 'fine_line'
  | 'realism'
  | 'neotraditional'
  | 'japanese'
  | 'minimalist'
  | 'geometric'
  | 'watercolor'
  | 'dotwork'
  | 'tribal'
  | 'old_school'
  | 'other';

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

export type FeedbackReaction = 'love' | 'refine' | 'like' | 'dislike' | 'neutral';

export type FeasibilityRecommendation = 'proceed' | 'caution' | 'not_recommended';

// -----------------------------------------------------------------------------
// Transform & AR Types
// -----------------------------------------------------------------------------

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

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface BodyPartConfig {
  landmarks: number[];
  baseScale: number;
  anchorIndex: number;
}

// -----------------------------------------------------------------------------
// Design Brief Types
// -----------------------------------------------------------------------------

export interface DesignBrief {
  placementZone?: PlacementZone;
  sizeCategory?: SizeCategory;
  sizeCm?: number;
  styleTags?: StyleTag[];
  colorMode?: ColorMode;
  accentColor?: string;
  conceptSummary?: string;
  isSleeve?: boolean;
  sleeveType?: 'half' | 'full' | null;
  sleeveTheme?: string;
  elementsJson?: {
    hero: string[];
    secondary: string[];
    fillers: string[];
  };
  referencesCount?: number;
  placementPhotoPresent?: boolean;
  existingTattoosPresent?: boolean;
  timelinePreference?: string;
  budgetRange?: string;
}

export interface DesignBriefLegacy {
  projectType: string;
  references: string[];
  description: string;
  size: string;
  placement: string;
  style: string;
  preferredDates: string[];
  estimatedHours: number;
}

// -----------------------------------------------------------------------------
// Session Types
// -----------------------------------------------------------------------------

export interface ConciergeSession {
  id: string;
  stage: SessionStage;
  designBriefJson: DesignBrief;
  readinessScore: number;
  intentFlagsJson: Record<string, boolean>;
  sketchOfferCooldownUntil?: string;
  sketchOfferDeclinedCount: number;
}

export interface ActionCard {
  type: 'button' | 'wizard' | 'chooser';
  label: string;
  actionKey: string;
  enabled: boolean;
  reason?: string;
  icon?: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ActionCard[];
  timestamp?: Date;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  url: string;
  type: 'reference_image' | 'placement_photo';
  thumbnailUrl?: string;
}

// -----------------------------------------------------------------------------
// Variant & Co-Design Types
// -----------------------------------------------------------------------------

export interface VariantScores {
  styleAlignment: number;
  clarity: number;
  uniqueness: number;
  arFitness: number;
}

export interface ConceptVariant {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  scores: VariantScores;
  selected?: boolean;
}

export interface CoDesignSession {
  id: string;
  chosenVariantId?: string;
  variants: ConceptVariant[];
  status: 'pending' | 'generating' | 'ready' | 'finalized';
}

// -----------------------------------------------------------------------------
// Feasibility Types
// -----------------------------------------------------------------------------

export interface FeasibilityFactor {
  name: string;
  impact: 'positive' | 'neutral' | 'negative';
  score: number;
  description?: string;
}

export interface FeasibilityResult {
  overallScore: number;
  recommendation: FeasibilityRecommendation;
  factors: FeasibilityFactor[];
  risks: string[];
  aging?: {
    year5?: string;
    year10?: string;
    year20?: string;
  };
}

// -----------------------------------------------------------------------------
// Availability Types
// -----------------------------------------------------------------------------

export interface AvailableSlot {
  id: string;
  date: string;
  label: string;
  time: string;
  city?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

// -----------------------------------------------------------------------------
// Pre-Gate Types
// -----------------------------------------------------------------------------

export interface PreGateQuestion {
  id: string;
  questionKey: string;
  questionText: string;
  description?: string;
  targetsField: string;
  blockOnValue?: boolean;
  displayOrder: number;
}

export interface PreGateResponses {
  wantsColor?: boolean;
  isCoverUp?: boolean;
  isTouchUp?: boolean;
  isRework?: boolean;
  isRepeatDesign?: boolean;
  is18Plus?: boolean;
}

export interface BlockReason {
  questionKey: string;
  reasonCode: string;
  message: string;
}

export interface PreGateResult {
  passed: boolean;
  responses: PreGateResponses;
  blockedBy: string[];
  blockReasons: BlockReason[];
}

export interface ArtistCapabilities {
  acceptsColorWork?: boolean;
  acceptsCoverups?: boolean;
  acceptsTouchups?: boolean;
  acceptsReworks?: boolean;
  willRepeatDesigns?: boolean;
}

// -----------------------------------------------------------------------------
// Session Estimation Types
// -----------------------------------------------------------------------------

export interface SessionBreakdown {
  session: number;
  description: string;
  hours: string;
}

export interface RiskFactor {
  name: string;
  impact: string;
}

export interface RevenueForcast {
  estimatedRange: string;
  min: number;
  max: number;
  depositAmount: string;
  hourlyRate: number;
}

export interface CausalNode {
  factor: string;
  effect: string;
  impact: string;
}

export interface QAOAOptimization {
  optimalPath: string;
  iterations: number;
  energyScore: number;
  alternativesEvaluated: number;
}

export interface FederatedLearning {
  localAccuracy: number;
  globalAccuracy: number;
  privacyScore: number;
  improvementRate: string;
}

export interface MCoTStep {
  step: number;
  description: string;
  confidence: number;
}

export interface WhatIfScenario {
  condition: string;
  outcome: string;
  revenueImpact: string;
}

export interface SessionEstimation {
  totalHoursRange: string;
  totalHoursMin: number;
  totalHoursMax: number;
  sessionsEstimate: string;
  sessionsMin: number;
  sessionsMax: number;
  sessionLength: string;
  breakdowns: Array<{ factor: string; multiplier: number; addedHours?: string }>;
  sessionBreakdown: SessionBreakdown[];
  confidence: number;
  mlDataPoints?: number;
  mlHistoricalAccuracy?: string;
  revenueForecast: RevenueForcast;
  recommendations: string[];
  riskFactors: RiskFactor[];
  aiInsights: string[];
  // God-mode fields
  qaoaOptimization?: QAOAOptimization;
  causalGraph?: CausalNode[];
  federatedLearning?: FederatedLearning;
  mcotReasoning?: MCoTStep[];
  whatIfScenarios?: WhatIfScenario[];
  godInsights?: string[];
}

// -----------------------------------------------------------------------------
// Component Props Types
// -----------------------------------------------------------------------------

export interface ARPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  referenceImageUrl: string;
  onBookingClick?: () => void;
  onCapture?: (imageUrl: string) => void;
  onFeedback?: (feedback: FeedbackReaction, screenshotUrl?: string) => void;
  suggestedBodyPart?: string;
  conversationId?: string;
  sketchId?: string;
  mode?: 'quick' | 'tracking';
}

export interface TransformControlsProps {
  transform: TattooTransform;
  onChange: (transform: TattooTransform) => void;
  showPosition?: boolean;
  disabled?: boolean;
}

export interface FeedbackButtonsProps {
  onFeedback: (reaction: FeedbackReaction, screenshotUrl?: string) => void;
  captureScreenshot?: () => string | undefined;
  variant?: 'default' | 'compact';
  onClose?: () => void;
}

export interface ImageUploaderProps {
  onUpload: (files: UploadedImage[]) => void;
  maxFiles?: number;
  currentCount?: number;
  accept?: string;
  disabled?: boolean;
  showProgress?: boolean;
}

export interface UploadedImage {
  file: File;
  preview: string;
  type: 'reference_image' | 'placement_photo';
}

// -----------------------------------------------------------------------------
// Studio Info Types
// -----------------------------------------------------------------------------

export interface StudioInfo {
  artistName: string;
  greeting: string;
  tagline: string;
  specialties: string[];
  experience: string;
  location: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  trigger: string;
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface DesignCompilerResponse {
  session?: ConciergeSession;
  response?: string;
  actions?: ActionCard[];
  arUrl?: string;
  codesignUrl?: string;
}

export interface BookingRequestPayload {
  workspaceId?: string;
  userId?: string;
  deviceFingerprint?: string;
  serviceType: string;
  status: string;
  route: string;
  brief: {
    description?: string;
    size?: string;
    placement?: string;
    style?: string;
  };
  referenceImages: string[];
  preferredDates: string[];
  estimatedHours: number;
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

export interface ConciergeError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

export type ErrorCode =
  | 'CAMERA_ACCESS_DENIED'
  | 'MEDIAPIPE_LOAD_FAILED'
  | 'IMAGE_UPLOAD_FAILED'
  | 'SESSION_INIT_FAILED'
  | 'API_ERROR'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR';

// -----------------------------------------------------------------------------
// MediaPipe Types (interfaces only, Window declaration is in ARTattooPreview.tsx)
// -----------------------------------------------------------------------------

export interface MediaPipePose {
  setOptions: (options: MediaPipePoseOptions) => void;
  onResults: (callback: (results: MediaPipePoseResults) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
}

export interface MediaPipePoseOptions {
  modelComplexity: 0 | 1 | 2;
  smoothLandmarks: boolean;
  enableSegmentation: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  [key: string]: unknown;
}

export interface MediaPipePoseResults {
  poseLandmarks?: LandmarkPoint[];
  segmentationMask?: ImageData;
}
