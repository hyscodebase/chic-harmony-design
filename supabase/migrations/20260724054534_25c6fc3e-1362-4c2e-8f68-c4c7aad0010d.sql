
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('operator', 'user');
CREATE TYPE public.order_status AS ENUM ('PENDING','PAID','CANCELED','FULFILLED');
CREATE TYPE public.contract_status AS ENUM ('PENDING','APPROVED','CONSUMED','SUPERSEDED','EXPIRED');
CREATE TYPE public.payment_status AS ENUM ('READY','APPROVED','CANCELED','FAILED');
CREATE TYPE public.entitlement_status AS ENUM ('ACTIVE','REVOKED','EXPIRED');
CREATE TYPE public.report_verdict AS ENUM ('ALLOW','BLOCK');

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  purpose text NOT NULL,
  amount_krw integer NOT NULL CHECK (amount_krw > 0),
  access_days integer NOT NULL DEFAULT 30,
  report_quota integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public products" ON public.products FOR SELECT TO anon, authenticated USING (is_active);

INSERT INTO public.products (code, name, description, purpose, amount_krw, access_days, report_quota)
VALUES (
  'INTENTLOCK_BETA_PASS_V1',
  'IntentLock Beta Pass',
  '30일 동안 Guardian 판정 리포트 최대 10건을 생성·저장·다운로드할 수 있는 베타 이용권입니다.',
  '30일 Guardian 리포트 이용권',
  1000, 30, 10
);

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  amount_krw integer NOT NULL CHECK (amount_krw > 0),
  status public.order_status NOT NULL DEFAULT 'PENDING',
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX orders_user_created ON public.orders (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'operator'));

-- ============ INTENT CONTRACTS ============
CREATE TABLE public.intent_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  natural_language text NOT NULL,
  normalized jsonb NOT NULL,
  purpose text NOT NULL,
  amount_limit_krw integer NOT NULL,
  fingerprint text NOT NULL,
  status public.contract_status NOT NULL DEFAULT 'PENDING',
  policy_verdict text,
  policy_reason text,
  approved_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, version)
);
CREATE INDEX intent_contracts_order ON public.intent_contracts (order_id, version DESC);
GRANT SELECT, INSERT, UPDATE ON public.intent_contracts TO authenticated;
GRANT ALL ON public.intent_contracts TO service_role;
ALTER TABLE public.intent_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contracts read" ON public.intent_contracts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'operator'));

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.intent_contracts(id),
  amount_krw integer NOT NULL,
  mock_payment_key text,
  status public.payment_status NOT NULL DEFAULT 'READY',
  method text,
  approved_at timestamptz,
  canceled_at timestamptz,
  receipt_no text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments read" ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'operator'));

-- ============ PAYMENT EVENTS (append-only audit) ============
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  handler text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_events_order ON public.payment_events (order_id, created_at DESC);
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit visible to owner or operator" ON public.payment_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'operator')))
  );

-- ============ ENTITLEMENTS ============
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  status public.entitlement_status NOT NULL DEFAULT 'ACTIVE',
  reports_remaining integer NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  UNIQUE (order_id)
);
CREATE INDEX entitlements_user ON public.entitlements (user_id, status);
GRANT SELECT, UPDATE ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entitlements read" ON public.entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'operator'));

-- ============ GUARDIAN REPORTS ============
CREATE TABLE public.guardian_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_id uuid NOT NULL REFERENCES public.entitlements(id) ON DELETE CASCADE,
  scenario text NOT NULL,
  proposed_amount_krw integer NOT NULL,
  proposed_purpose text NOT NULL,
  verdict public.report_verdict NOT NULL,
  reason text NOT NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guardian_reports_user ON public.guardian_reports (user_id, created_at DESC);
GRANT SELECT ON public.guardian_reports TO authenticated;
GRANT ALL ON public.guardian_reports TO service_role;
ALTER TABLE public.guardian_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports read" ON public.guardian_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'operator'));

-- ============ CANCELLATION REQUESTS ============
CREATE TABLE public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 200),
  idempotency_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id),
  UNIQUE (idempotency_key)
);
GRANT SELECT ON public.cancellation_requests TO authenticated;
GRANT ALL ON public.cancellation_requests TO service_role;
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cancellation visible to owner or operator" ON public.cancellation_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'operator')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
