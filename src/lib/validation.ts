// =============================================================================
// VALIDATION SCHEMAS - Zod schemas for form validation
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Design Brief Schema
// -----------------------------------------------------------------------------

export const placementZoneSchema = z.enum([
  'arm',
  'forearm',
  'wrist',
  'shoulder',
  'chest',
  'back',
  'ribs',
  'leg',
  'ankle',
  'neck',
  'hand',
  'other',
]);

export const sizeCategorySchema = z.enum(['small', 'medium', 'large', 'xlarge']);

export const colorModeSchema = z.enum(['blackgrey', 'full_color', 'single_accent']);

export const styleTagSchema = z.enum([
  'blackwork',
  'fine_line',
  'realism',
  'neotraditional',
  'japanese',
  'minimalist',
  'geometric',
  'watercolor',
  'dotwork',
  'tribal',
  'old_school',
  'other',
]);

export const designBriefSchema = z.object({
  placementZone: placementZoneSchema.optional(),
  sizeCategory: sizeCategorySchema.optional(),
  sizeCm: z.number().min(1).max(100).optional(),
  styleTags: z.array(styleTagSchema).optional(),
  colorMode: colorModeSchema.optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  conceptSummary: z.string().max(2000).optional(),
  isSleeve: z.boolean().optional(),
  sleeveType: z.enum(['half', 'full']).nullable().optional(),
  sleeveTheme: z.string().max(500).optional(),
  elementsJson: z
    .object({
      hero: z.array(z.string()),
      secondary: z.array(z.string()),
      fillers: z.array(z.string()),
    })
    .optional(),
  referencesCount: z.number().min(0).max(20).optional(),
  placementPhotoPresent: z.boolean().optional(),
  existingTattoosPresent: z.boolean().optional(),
  timelinePreference: z.string().max(200).optional(),
  budgetRange: z.string().max(100).optional(),
});

export type DesignBriefInput = z.infer<typeof designBriefSchema>;

// -----------------------------------------------------------------------------
// Booking Request Schema
// -----------------------------------------------------------------------------

export const projectTypeSchema = z.enum(['new_tattoo', 'coverup', 'touchup']);

export const bookingBriefSchema = z.object({
  projectType: projectTypeSchema,
  description: z.string().max(2000).optional(),
  size: sizeCategorySchema,
  placement: placementZoneSchema,
  style: styleTagSchema.optional(),
});

export const bookingRequestSchema = z.object({
  projectType: projectTypeSchema,
  references: z.array(z.string().url()).max(10),
  description: z.string().max(2000).optional(),
  size: sizeCategorySchema,
  placement: placementZoneSchema,
  style: styleTagSchema.optional(),
  preferredDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(10),
  estimatedHours: z.number().min(1).max(100).optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

// Validation for booking request form steps
export const bookingStepValidators = {
  type: z.object({
    projectType: projectTypeSchema,
  }),
  references: z.object({
    references: z.array(z.string().url()).max(10),
    description: z.string().max(2000).optional(),
  }),
  details: z.object({
    size: sizeCategorySchema,
    placement: placementZoneSchema,
    style: styleTagSchema.optional(),
  }),
  availability: z.object({
    preferredDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(10),
  }),
};

// -----------------------------------------------------------------------------
// Pre-Gate Responses Schema
// -----------------------------------------------------------------------------

export const preGateResponsesSchema = z.object({
  wantsColor: z.boolean().optional(),
  isCoverUp: z.boolean().optional(),
  isTouchUp: z.boolean().optional(),
  isRework: z.boolean().optional(),
  isRepeatDesign: z.boolean().optional(),
  is18Plus: z.boolean().optional(),
});

export type PreGateResponsesInput = z.infer<typeof preGateResponsesSchema>;

// -----------------------------------------------------------------------------
// Message Schema
// -----------------------------------------------------------------------------

export const messageAttachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(['reference_image', 'placement_photo']),
  thumbnailUrl: z.string().url().optional(),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  attachments: z.array(messageAttachmentSchema).max(5).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// -----------------------------------------------------------------------------
// Transform Schema
// -----------------------------------------------------------------------------

export const tattooTransformSchema = z.object({
  scale: z.number().min(0.1).max(5),
  rotation: z.number().min(-360).max(360),
  opacity: z.number().min(0).max(1),
  offsetX: z.number().min(-1000).max(1000),
  offsetY: z.number().min(-1000).max(1000),
});

export type TattooTransformInput = z.infer<typeof tattooTransformSchema>;

// -----------------------------------------------------------------------------
// Image Upload Schema
// -----------------------------------------------------------------------------

export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 10 * 1024 * 1024, {
    message: 'File size must be less than 10MB',
  })
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    {
      message: 'File must be JPEG, PNG, or WebP',
    }
  );

export const imageUploadSchema = z.object({
  files: z.array(imageFileSchema).min(1).max(5),
  type: z.enum(['reference_image', 'placement_photo']).default('reference_image'),
});

export type ImageUploadInput = z.infer<typeof imageUploadSchema>;

// -----------------------------------------------------------------------------
// API Response Schemas
// -----------------------------------------------------------------------------

export const actionCardSchema = z.object({
  type: z.enum(['button', 'wizard', 'chooser']),
  label: z.string(),
  actionKey: z.string(),
  enabled: z.boolean(),
  reason: z.string().optional(),
  icon: z.string().optional(),
});

export const sessionStageSchema = z.enum([
  'discovery',
  'brief_building',
  'design_alignment',
  'preview_ready',
  'scheduling',
  'deposit',
  'confirmed',
]);

export const conciergeSessionSchema = z.object({
  id: z.string().uuid(),
  stage: sessionStageSchema,
  designBriefJson: designBriefSchema,
  readinessScore: z.number().min(0).max(1),
  intentFlagsJson: z.record(z.boolean()),
  sketchOfferCooldownUntil: z.string().datetime().optional(),
  sketchOfferDeclinedCount: z.number().min(0),
});

export const designCompilerResponseSchema = z.object({
  session: conciergeSessionSchema.optional(),
  response: z.string().optional(),
  actions: z.array(actionCardSchema).optional(),
  arUrl: z.string().url().optional(),
  codesignUrl: z.string().url().optional(),
});

// -----------------------------------------------------------------------------
// Variant Schemas
// -----------------------------------------------------------------------------

export const variantScoresSchema = z.object({
  styleAlignment: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  uniqueness: z.number().min(0).max(1),
  arFitness: z.number().min(0).max(1),
});

export const conceptVariantSchema = z.object({
  id: z.string(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  scores: variantScoresSchema,
  selected: z.boolean().optional(),
});

export const variantFeedbackSchema = z.object({
  variantId: z.string(),
  reaction: z.enum(['like', 'dislike', 'neutral']),
});

export type VariantFeedbackInput = z.infer<typeof variantFeedbackSchema>;

// -----------------------------------------------------------------------------
// Feasibility Schemas
// -----------------------------------------------------------------------------

export const feasibilityFactorSchema = z.object({
  name: z.string(),
  impact: z.enum(['positive', 'neutral', 'negative']),
  score: z.number().min(0).max(1),
  description: z.string().optional(),
});

export const feasibilityResultSchema = z.object({
  overallScore: z.number().min(0).max(1),
  recommendation: z.enum(['proceed', 'caution', 'not_recommended']),
  factors: z.array(feasibilityFactorSchema),
  risks: z.array(z.string()),
  aging: z
    .object({
      year5: z.string().optional(),
      year10: z.string().optional(),
      year20: z.string().optional(),
    })
    .optional(),
});

// -----------------------------------------------------------------------------
// Utility Validation Functions
// -----------------------------------------------------------------------------

/**
 * Validate and return parsed data or null
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Get human-readable error messages from Zod errors
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return errors;
}

/**
 * Validate booking step and return errors
 */
export function validateBookingStep(
  step: keyof typeof bookingStepValidators,
  data: unknown
): { valid: boolean; errors: Record<string, string> } {
  const schema = bookingStepValidators[step];
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: {} };
  }

  return { valid: false, errors: getValidationErrors(result.error) };
}

// -----------------------------------------------------------------------------
// Sanitization Utilities
// -----------------------------------------------------------------------------

/**
 * Basic XSS sanitization for user input
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate a design description
 */
export function sanitizeDescription(input: string): string {
  // Remove any HTML tags
  const stripped = input.replace(/<[^>]*>/g, '');
  // Limit length
  const limited = stripped.slice(0, 2000);
  // Basic sanitization
  return sanitizeText(limited);
}
