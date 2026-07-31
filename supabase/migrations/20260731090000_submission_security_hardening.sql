-- All state changes are performed by authenticated server functions with the
-- service-role client. Browser clients retain read-only access through RLS.

DROP POLICY IF EXISTS "audit insert by owner or operator" ON public.payment_events;
DROP POLICY IF EXISTS "own reports insert" ON public.guardian_reports;
DROP POLICY IF EXISTS "cancellation insert by owner or operator" ON public.cancellation_requests;
DROP POLICY IF EXISTS "cancellation update by operator" ON public.cancellation_requests;

REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.intent_contracts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.entitlements FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.guardian_reports FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cancellation_requests FROM anon, authenticated;
