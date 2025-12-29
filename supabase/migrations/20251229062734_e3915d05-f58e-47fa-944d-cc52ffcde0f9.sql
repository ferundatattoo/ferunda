-- Fix the security definer view warning by setting security invoker
ALTER VIEW public.customer_booking_view SET (security_invoker = on);