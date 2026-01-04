-- ============================================================================
-- FIX PREMIUM TIER: Make basic AI free, gate only advanced features
-- ============================================================================

-- 1. Add new "ai-lite" module for basic AI (chat, vision, basic realtime)
INSERT INTO ethereal_modules (module_key, display_name, description, category, is_always_free, is_locked, sort_order, features)
VALUES (
  'ai-lite',
  'AI Concierge',
  'Basic AI chat, image upload, vision analysis, and realtime messaging',
  'lite',
  true,
  false,
  14,
  '["AI Chat", "Image Upload", "Vision Analysis", "Basic Realtime", "Language Detection"]'::jsonb
)
ON CONFLICT (module_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = 'lite',
  is_always_free = true,
  is_locked = false,
  features = EXCLUDED.features;

-- 2. Update ai-center to be the PRO version (AR live, deep reasoning, marketing gen)
UPDATE ethereal_modules 
SET 
  display_name = 'AI Center PRO',
  description = 'Advanced AI: AR Live, Grok Deep Reasoning, Marketing Gen, Full Sync, Workflow Builder',
  category = 'addon',
  is_always_free = false,
  features = '["AR Live", "Grok Deep Reasoning", "Marketing Generation", "Full Sync", "Workflow Builder", "Shadow Mode", "Drift Detection", "Client Segmentation"]'::jsonb
WHERE module_key = 'ai-center';

-- 3. Add ar-live as a separate PRO feature
INSERT INTO ethereal_modules (module_key, display_name, description, category, is_always_free, is_locked, sort_order, features, parent_module)
VALUES (
  'ar-live',
  'AR Live Preview',
  'Full augmented reality tattoo preview with body tracking',
  'pro',
  false,
  false,
  15,
  '["Real-time AR", "Body Tracking", "Perspective Matching", "Recording", "High-res Export"]'::jsonb,
  'creative-pro'
)
ON CONFLICT (module_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = 'pro',
  is_always_free = false,
  features = EXCLUDED.features;

-- 4. Update pricing plans to include ai-lite in ALL plans (including free)
UPDATE ethereal_pricing_plans 
SET included_modules = array_append(included_modules, 'ai-lite')
WHERE NOT ('ai-lite' = ANY(included_modules));

-- 5. Add ar-live to Ultimate plans only
UPDATE ethereal_pricing_plans 
SET included_modules = array_append(included_modules, 'ar-live')
WHERE plan_key IN ('solo_ultimate', 'studio_ultimate', 'enterprise')
  AND NOT ('ar-live' = ANY(included_modules));

-- 6. Ensure creative-lite includes basic AR preview (static, no live tracking)
UPDATE ethereal_modules 
SET features = '["Design Library", "Reference Gallery", "Static AR Preview", "Basic Sketch Tools"]'::jsonb
WHERE module_key = 'creative-lite';

-- 7. Update creative-pro to include advanced AR
UPDATE ethereal_modules 
SET features = '["AI Design Generation", "Body Atlas", "AR Live", "Style Transfer", "Advanced Sketch Tools"]'::jsonb
WHERE module_key = 'creative-pro';