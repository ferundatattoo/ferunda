-- FIX SECURITY WARNINGS: Convert SECURITY DEFINER views to SECURITY INVOKER
-- =====================================================

-- Drop and recreate views with SECURITY INVOKER (default, explicit)
DROP VIEW IF EXISTS public.finance_dashboard_metrics;
CREATE VIEW public.finance_dashboard_metrics 
WITH (security_invoker = true)
AS
SELECT 
  COUNT(*) FILTER (WHERE deposit_paid = true) as total_deposits_received,
  COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_paid = true), 0) as total_deposit_amount,
  COALESCE(SUM(total_paid), 0) as total_revenue,
  COUNT(*) FILTER (WHERE deposit_paid = false AND status NOT IN ('cancelled', 'rejected')) as pending_deposits,
  COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_paid = false AND status NOT IN ('cancelled', 'rejected')), 0) as pending_deposit_amount,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  DATE_TRUNC('month', created_at) as month
FROM public.bookings
GROUP BY DATE_TRUNC('month', created_at);

DROP VIEW IF EXISTS public.studio_analytics_view;
CREATE VIEW public.studio_analytics_view
WITH (security_invoker = true)
AS
SELECT 
  DATE_TRUNC('month', b.created_at) as month,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE b.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled,
  COALESCE(SUM(b.deposit_amount) FILTER (WHERE b.deposit_paid = true), 0) as revenue,
  COUNT(DISTINCT b.email) as unique_clients,
  ROUND(AVG(CASE WHEN b.deposit_paid THEN 1 ELSE 0 END) * 100, 2) as deposit_conversion_rate
FROM public.bookings b
GROUP BY DATE_TRUNC('month', b.created_at);