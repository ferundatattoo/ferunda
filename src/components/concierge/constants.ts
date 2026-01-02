// =============================================================================
// CONCIERGE CONSTANTS - Shared configuration values
// =============================================================================

import type { BodyPart } from '@/types/concierge';

// -----------------------------------------------------------------------------
// Body Part Configuration for MediaPipe
// -----------------------------------------------------------------------------

export const BODY_PART_CONFIG: Record<
  BodyPart,
  { landmarks: [number, number]; baseScale: number }
> = {
  left_wrist: { landmarks: [15, 17], baseScale: 0.3 },
  right_wrist: { landmarks: [16, 18], baseScale: 0.3 },
  left_inner_forearm: { landmarks: [13, 15], baseScale: 0.5 },
  right_inner_forearm: { landmarks: [14, 16], baseScale: 0.5 },
  left_outer_forearm: { landmarks: [13, 15], baseScale: 0.5 },
  right_outer_forearm: { landmarks: [14, 16], baseScale: 0.5 },
  left_bicep: { landmarks: [11, 13], baseScale: 0.6 },
  right_bicep: { landmarks: [12, 14], baseScale: 0.6 },
  chest_center: { landmarks: [11, 12], baseScale: 0.8 },
  stomach: { landmarks: [23, 24], baseScale: 0.7 },
  upper_back: { landmarks: [11, 12], baseScale: 0.9 },
  lower_back: { landmarks: [23, 24], baseScale: 0.7 },
  left_thigh_front: { landmarks: [23, 25], baseScale: 0.7 },
  right_thigh_front: { landmarks: [24, 26], baseScale: 0.7 },
  left_calf: { landmarks: [25, 27], baseScale: 0.5 },
  right_calf: { landmarks: [26, 28], baseScale: 0.5 },
};

// -----------------------------------------------------------------------------
// Body Part Options for UI
// -----------------------------------------------------------------------------

export const BODY_PART_OPTIONS: { value: BodyPart; label: string }[] = [
  { value: 'left_inner_forearm', label: 'Inner Forearm' },
  { value: 'left_outer_forearm', label: 'Outer Forearm' },
  { value: 'left_bicep', label: 'Bicep' },
  { value: 'left_wrist', label: 'Wrist' },
  { value: 'chest_center', label: 'Chest' },
  { value: 'upper_back', label: 'Upper Back' },
  { value: 'left_thigh_front', label: 'Thigh' },
  { value: 'left_calf', label: 'Calf' },
];

// -----------------------------------------------------------------------------
// Transform Limits for Sliders
// -----------------------------------------------------------------------------

export const TRANSFORM_LIMITS = {
  scale: { min: 0.2, max: 3, step: 0.05 },
  rotation: { min: -180, max: 180, step: 1 },
  opacity: { min: 0.1, max: 1, step: 0.05 },
  offset: { min: -200, max: 200, step: 1 },
};

// -----------------------------------------------------------------------------
// Image Upload Configuration
// -----------------------------------------------------------------------------

export const IMAGE_UPLOAD_CONFIG = {
  maxFiles: 5,
  maxSizeMB: 10,
  compressThresholdMB: 2,
  compressTargetMB: 2,
  compressQuality: 0.85,
  compressMaxDimension: 2048,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

// -----------------------------------------------------------------------------
// Animation Variants for Framer Motion
// -----------------------------------------------------------------------------

export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 },
  },
};

// -----------------------------------------------------------------------------
// MediaPipe Script URLs
// -----------------------------------------------------------------------------

export const MEDIAPIPE_URLS = {
  pose: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
  camera: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  filesBase: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/',
};
