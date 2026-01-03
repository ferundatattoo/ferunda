-- Insert a dev subscription for the main workspace if it doesn't exist
INSERT INTO workspace_subscriptions (
  workspace_id,
  plan_key,
  purchased_addons,
  purchased_bundles,
  seat_count,
  monthly_total,
  status
) VALUES (
  '4c4452fc-77f8-4f42-a96c-d0e0c28901fd',
  'solo_free',
  '{}',
  '{}',
  1,
  0,
  'active'
) ON CONFLICT (workspace_id) DO NOTHING;