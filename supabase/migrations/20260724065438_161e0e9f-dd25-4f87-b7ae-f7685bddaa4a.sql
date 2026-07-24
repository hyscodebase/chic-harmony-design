
-- orders
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own orders update" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'operator')) WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'operator'));

-- intent_contracts
CREATE POLICY "own contracts insert" ON public.intent_contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contracts update" ON public.intent_contracts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- payments
CREATE POLICY "own payments insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own payments update" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'operator')) WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'operator'));

-- entitlements
CREATE POLICY "own entitlements insert" ON public.entitlements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own entitlements update" ON public.entitlements FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'operator')) WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'operator'));

-- guardian_reports
CREATE POLICY "own reports insert" ON public.guardian_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- payment_events: insert allowed when related order belongs to user or caller is operator
CREATE POLICY "audit insert by owner or operator" ON public.payment_events FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'operator') OR EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = payment_events.order_id AND o.user_id = auth.uid()
  )
);

-- cancellation_requests
CREATE POLICY "cancellation insert by owner or operator" ON public.cancellation_requests FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'operator') OR EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = cancellation_requests.order_id AND o.user_id = auth.uid()
  )
);
CREATE POLICY "cancellation update by operator" ON public.cancellation_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(),'operator')) WITH CHECK (has_role(auth.uid(),'operator'));
