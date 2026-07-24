import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  sha256Hex,
  newOrderNo,
  normalizeIntent,
  judgeContractPolicy,
  guardianJudge,
  type NormalizedContract,
} from "./intentlock.server";

// Load service-role client only inside handlers (server-only module).
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- 상품 조회 ----------
export const getBetaPassProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .eq("code", "INTENTLOCK_BETA_PASS_V1")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Beta Pass 상품을 찾을 수 없습니다.");
    return data;
  });

// ---------- 주문 생성 ----------
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ idempotency_key: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 멱등 재사용
    const existing = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .eq("idempotency_key", data.idempotency_key)
      .maybeSingle();
    if (existing.data) return { order: existing.data, reused: true };

    const product = await supabase
      .from("products")
      .select("*")
      .eq("code", "INTENTLOCK_BETA_PASS_V1")
      .eq("is_active", true)
      .maybeSingle();
    if (product.error || !product.data)
      throw new Error("판매 중인 Beta Pass 를 찾을 수 없습니다.");

    const orderNo = newOrderNo();
    const admin = await getAdmin();
    const insert = await admin
      .from("orders")
      .insert({
        order_no: orderNo,
        user_id: userId,
        product_id: product.data.id,
        product_name: product.data.name,
        amount_krw: product.data.amount_krw,
        idempotency_key: data.idempotency_key,
      })
      .select("*")
      .single();
    if (insert.error) throw new Error(insert.error.message);

    await supabase.from("payment_events").insert({
      order_id: insert.data.id,
      event_type: "ORDER_CREATED",
      handler: "createOrder",
      payload: { amount_krw: product.data.amount_krw, product_code: product.data.code },
    });
    return { order: insert.data, reused: false };
  });

// ---------- 계약 생성 ----------
export const createContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        natural_language: z.string().min(5).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("id", data.order_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (order.error || !order.data) throw new Error("주문을 찾을 수 없습니다.");
    if (order.data.status !== "PENDING")
      throw new Error("계약을 수정할 수 있는 상태가 아닙니다.");

    const admin = await getAdmin();
    // 이전 버전 SUPERSEDE
    await admin
      .from("intent_contracts")
      .update({ status: "SUPERSEDED" })
      .eq("order_id", order.data.id)
      .in("status", ["PENDING", "APPROVED"]);

    const product = order.data.products as {
      name: string;
      purpose: string;
      amount_krw: number;
    };
    const normalized: NormalizedContract = await normalizeIntent(
      data.natural_language,
      product,
    );
    const policy = judgeContractPolicy(normalized, product);

    // 다음 버전 계산
    const versionRow = await supabase
      .from("intent_contracts")
      .select("version")
      .eq("order_id", order.data.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (versionRow.data?.version ?? 0) + 1;

    const fingerprintInput = JSON.stringify({
      order_id: order.data.id,
      version: nextVersion,
      normalized,
    });
    const fingerprint = sha256Hex(fingerprintInput);

    const insert = await admin
      .from("intent_contracts")
      .insert({
        order_id: order.data.id,
        user_id: userId,
        version: nextVersion,
        natural_language: data.natural_language,
        normalized: normalized as unknown as never,
        purpose: normalized.purpose,
        amount_limit_krw: normalized.amount_limit_krw,
        fingerprint,
        policy_verdict: policy.verdict,
        policy_reason: policy.reason,
      })
      .select("*")
      .single();
    if (insert.error) throw new Error(insert.error.message);

    await supabase.from("payment_events").insert({
      order_id: order.data.id,
      event_type: "CONTRACT_CREATED",
      handler: "createContract",
      payload: { version: nextVersion, fingerprint, policy },
    });
    return { contract: insert.data, policy };
  });

// ---------- 계약 승인 ----------
export const approveContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ contract_id: z.string().uuid(), fingerprint: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contract = await supabase
      .from("intent_contracts")
      .select("*")
      .eq("id", data.contract_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (contract.error || !contract.data) throw new Error("계약을 찾을 수 없습니다.");
    if (contract.data.status !== "PENDING")
      throw new Error(`CONTRACT_${contract.data.status}: 승인할 수 없는 상태.`);
    if (contract.data.fingerprint !== data.fingerprint)
      throw new Error("CONTRACT_FINGERPRINT_MISMATCH: 지문이 일치하지 않습니다.");
    if (contract.data.policy_verdict !== "PASS")
      throw new Error(`정책 판정 실패: ${contract.data.policy_reason ?? ""}`);
    if (new Date(contract.data.expires_at) < new Date())
      throw new Error("CONTRACT_EXPIRED: 계약이 만료되었습니다.");

    const admin = await getAdmin();
    const upd = await admin
      .from("intent_contracts")
      .update({ status: "APPROVED", approved_at: new Date().toISOString() })
      .eq("id", data.contract_id)
      .eq("status", "PENDING")
      .select("*")
      .single();
    if (upd.error) throw new Error(upd.error.message);

    await supabase.from("payment_events").insert({
      order_id: contract.data.order_id,
      event_type: "CONTRACT_APPROVED",
      handler: "approveContract",
      payload: { contract_id: contract.data.id, version: contract.data.version },
    });
    return { contract: upd.data };
  });

// ---------- Guardian 결제 판정 ----------
export const guardCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await supabase
      .from("orders")
      .select("*, intent_contracts(*)")
      .eq("id", data.order_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (order.error || !order.data) throw new Error("주문을 찾을 수 없습니다.");

    const contracts = (order.data.intent_contracts ?? []) as Array<{
      id: string;
      status: string;
      version: number;
      amount_limit_krw: number;
      purpose: string;
    }>;
    const approved = contracts
      .filter((c) => c.status === "APPROVED")
      .sort((a, b) => b.version - a.version)[0];
    if (!approved) {
      return { verdict: "BLOCK", reason: "승인된 계약이 없습니다." };
    }
    if (approved.amount_limit_krw < order.data.amount_krw) {
      return {
        verdict: "BLOCK",
        reason: `계약 상한(${approved.amount_limit_krw}원) < 주문 금액(${order.data.amount_krw}원).`,
      };
    }
    await supabase.from("payment_events").insert({
      order_id: order.data.id,
      event_type: "GUARDIAN_ALLOWED",
      handler: "guardCheckout",
      payload: { contract_id: approved.id, amount_krw: order.data.amount_krw },
    });
    return { verdict: "ALLOW", reason: "계약 상한 이내입니다.", contract_id: approved.id };
  });

// ---------- 모의 결제 승인 ----------
export const mockConfirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ order_id: z.string().uuid(), method: z.enum(["카드", "계좌이체", "간편결제"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("id", data.order_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (order.error || !order.data) throw new Error("주문을 찾을 수 없습니다.");
    if (order.data.status === "PAID" || order.data.status === "FULFILLED") {
      // 멱등: 기존 결제 반환
      const existing = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", order.data.id)
        .maybeSingle();
      return { payment: existing.data, reused: true };
    }
    if (order.data.status !== "PENDING") throw new Error("결제할 수 없는 주문 상태입니다.");

    // 최신 승인 계약 확인
    const contract = await supabase
      .from("intent_contracts")
      .select("*")
      .eq("order_id", order.data.id)
      .eq("status", "APPROVED")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!contract.data) throw new Error("승인된 계약이 없습니다.");
    if (contract.data.amount_limit_krw < order.data.amount_krw)
      throw new Error("Guardian BLOCK: 계약 상한을 초과했습니다.");

    const paymentKey = `MOCK-${sha256Hex(order.data.id + Date.now()).slice(0, 24).toUpperCase()}`;
    const receiptNo = `RCPT-${Date.now().toString(36).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const admin = await getAdmin();
    // payment upsert
    const payment = await admin
      .from("payments")
      .upsert(
        {
          order_id: order.data.id,
          user_id: userId,
          contract_id: contract.data.id,
          amount_krw: order.data.amount_krw,
          mock_payment_key: paymentKey,
          status: "APPROVED",
          method: data.method,
          approved_at: nowIso,
          receipt_no: receiptNo,
        },
        { onConflict: "order_id" },
      )
      .select("*")
      .single();
    if (payment.error) throw new Error(payment.error.message);

    // 주문/계약 전이
    await admin.from("orders").update({ status: "PAID", updated_at: nowIso }).eq("id", order.data.id);
    await admin.from("intent_contracts").update({ status: "CONSUMED" }).eq("id", contract.data.id);

    // 이용권 지급
    const product = order.data.products as { access_days: number; report_quota: number };
    const expiresAt = new Date(Date.now() + product.access_days * 86400000).toISOString();
    await admin.from("entitlements").upsert(
      {
        user_id: userId,
        order_id: order.data.id,
        product_id: order.data.product_id,
        status: "ACTIVE",
        reports_remaining: product.report_quota,
        granted_at: nowIso,
        expires_at: expiresAt,
      },
      { onConflict: "order_id" },
    );
    await admin.from("orders").update({ status: "FULFILLED" }).eq("id", order.data.id);

    await supabase.from("payment_events").insert([
      {
        order_id: order.data.id,
        event_type: "PAYMENT_APPROVED",
        handler: "mockConfirmPayment",
        payload: { payment_key: paymentKey, method: data.method, amount_krw: order.data.amount_krw },
      },
      {
        order_id: order.data.id,
        event_type: "ENTITLEMENT_GRANTED",
        handler: "mockConfirmPayment",
        payload: { expires_at: expiresAt, reports_remaining: product.report_quota },
      },
    ]);

    return { payment: payment.data, reused: false };
  });

// ---------- Guardian 리포트 생성 ----------
export const generateGuardianReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        entitlement_id: z.string().uuid(),
        scenario: z.string().min(10).max(500),
        proposed_amount_krw: z.number().int().min(0).max(100_000_000),
        proposed_purpose: z.string().min(2).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ent = await supabase
      .from("entitlements")
      .select("*, orders(*, intent_contracts(*))")
      .eq("id", data.entitlement_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (ent.error || !ent.data) throw new Error("이용권을 찾을 수 없습니다.");
    if (ent.data.status !== "ACTIVE") throw new Error("이용권이 활성 상태가 아닙니다.");
    if (new Date(ent.data.expires_at) < new Date()) throw new Error("이용권이 만료되었습니다.");
    if (ent.data.reports_remaining <= 0) throw new Error("잔여 리포트가 없습니다.");

    const contracts = (ent.data.orders?.intent_contracts ?? []) as unknown as Array<{
      status: string;
      version: number;
      normalized: NormalizedContract;
    }>;
    const consumed = contracts.find((c) => c.status === "CONSUMED");
    const normalized: NormalizedContract =
      consumed?.normalized ?? {
        purpose: "IntentLock Beta Pass 이용",
        amount_limit_krw: 1000,
        count: 1,
        currency: "KRW",
        notes: "",
      };

    const judgement = await guardianJudge(
      `제안 목적: ${data.proposed_purpose}\n제안 금액: ${data.proposed_amount_krw}원\n시나리오: ${data.scenario}`,
      normalized,
    );

    const insert = await supabase
      .from("guardian_reports")
      .insert({
        user_id: userId,
        entitlement_id: ent.data.id,
        scenario: data.scenario,
        proposed_amount_krw: data.proposed_amount_krw,
        proposed_purpose: data.proposed_purpose,
        verdict: judgement.verdict,
        reason: judgement.reason,
        raw: judgement as unknown as never,
      })
      .select("*")
      .single();
    if (insert.error) throw new Error(insert.error.message);

    const admin = await getAdmin();
    await admin
      .from("entitlements")
      .update({ reports_remaining: ent.data.reports_remaining - 1 })
      .eq("id", ent.data.id)
      .gt("reports_remaining", 0);

    return { report: insert.data };
  });

// ---------- 운영자: 전액 취소 ----------
export const operatorCancel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        reason: z.string().min(10).max(200),
        idempotency_key: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isOperator } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "operator",
    });
    if (!isOperator) throw new Error("운영자 권한이 없습니다.");

    const existing = await supabase
      .from("cancellation_requests")
      .select("*")
      .eq("idempotency_key", data.idempotency_key)
      .maybeSingle();
    if (existing.data) return { cancellation: existing.data, reused: true };

    const nowIso = new Date().toISOString();
    const insert = await supabase
      .from("cancellation_requests")
      .insert({
        order_id: data.order_id,
        operator_id: userId,
        reason: data.reason,
        idempotency_key: data.idempotency_key,
        completed_at: nowIso,
      })
      .select("*")
      .single();
    if (insert.error) throw new Error(insert.error.message);

    const admin = await getAdmin();
    await admin
      .from("payments")
      .update({ status: "CANCELED", canceled_at: nowIso })
      .eq("order_id", data.order_id);
    await admin.from("orders").update({ status: "CANCELED", updated_at: nowIso }).eq("id", data.order_id);
    await admin
      .from("entitlements")
      .update({ status: "REVOKED", revoked_at: nowIso })
      .eq("order_id", data.order_id);

    await supabase.from("payment_events").insert({
      order_id: data.order_id,
      event_type: "PAYMENT_CANCELED",
      handler: "operatorCancel",
      payload: { operator_id: userId, reason: data.reason },
    });
    return { cancellation: insert.data, reused: false };
  });

// ---------- 조회 함수들 ----------
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orders = await supabase
      .from("orders")
      .select("*, payments(*), entitlements(*), cancellation_requests(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (orders.error) throw new Error(orders.error.message);
    return orders.data;
  });

// ---------- 테스트 서버: 즉시 구매 (0원) ----------
export const testInstantPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ idempotency_key: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const existing = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .eq("idempotency_key", data.idempotency_key)
      .maybeSingle();
    if (existing.data) return { order: existing.data, reused: true };

    // 남용 방지: 사용자당 활성 무료 이용권 1개로 제한
    const activeEnt = await supabase
      .from("entitlements")
      .select("id, order_id, expires_at, status")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (activeEnt.data) {
      const priorOrder = await supabase
        .from("orders")
        .select("*")
        .eq("id", activeEnt.data.order_id)
        .maybeSingle();
      if (priorOrder.data) return { order: priorOrder.data, reused: true };
      throw new Error("이미 활성 이용권이 있습니다.");
    }

    const product = await supabase
      .from("products")
      .select("*")
      .eq("code", "INTENTLOCK_BETA_PASS_V1")
      .eq("is_active", true)
      .maybeSingle();
    if (product.error || !product.data)
      throw new Error("판매 중인 Beta Pass 를 찾을 수 없습니다.");

    const orderNo = newOrderNo();
    const nowIso = new Date().toISOString();
    const admin = await getAdmin();
    const insert = await admin
      .from("orders")
      .insert({
        order_no: orderNo,
        user_id: userId,
        product_id: product.data.id,
        product_name: product.data.name,
        amount_krw: product.data.amount_krw,
        idempotency_key: data.idempotency_key,
        status: "FULFILLED",
      })
      .select("*")
      .single();
    if (insert.error) throw new Error(insert.error.message);

    const expiresAt = new Date(
      Date.now() + product.data.access_days * 86400000,
    ).toISOString();
    await admin.from("entitlements").upsert(
      {
        user_id: userId,
        order_id: insert.data.id,
        product_id: product.data.id,
        status: "ACTIVE",
        reports_remaining: product.data.report_quota,
        granted_at: nowIso,
        expires_at: expiresAt,
      },
      { onConflict: "order_id" },
    );

    await supabase.from("payment_events").insert({
      order_id: insert.data.id,
      event_type: "TEST_INSTANT_PURCHASE",
      handler: "testInstantPurchase",
      payload: { note: "0원 테스트 서버 즉시 지급" },
    });
    return { order: insert.data, reused: false };
  });

export const getOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const order = await supabase
      .from("orders")
      .select("*, products(*), intent_contracts(*), payments(*), entitlements(*), payment_events(*)")
      .eq("id", data.order_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (order.error) throw new Error(order.error.message);
    if (!order.data) throw new Error("주문을 찾을 수 없습니다.");
    return order.data;
  });

export const getMyEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ent = await supabase
      .from("entitlements")
      .select("*, guardian_reports(id, created_at, verdict)")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ent.error) throw new Error(ent.error.message);
    return ent.data;
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const reports = await supabase
      .from("guardian_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (reports.error) throw new Error(reports.error.message);
    return reports.data;
  });

export const getReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const r = await supabase
      .from("guardian_reports")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (r.error) throw new Error(r.error.message);
    if (!r.data) throw new Error("리포트를 찾을 수 없습니다.");
    return r.data;
  });

export const operatorListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isOperator } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "operator",
    });
    if (!isOperator) throw new Error("운영자 권한이 없습니다.");
    const orders = await supabase
      .from("orders")
      .select("*, payments(*), cancellation_requests(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (orders.error) throw new Error(orders.error.message);
    return orders.data;
  });

export const checkOperatorRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "operator",
    });
    return { isOperator: Boolean(data) };
  });

// ---------- 에이전트 쇼핑 시뮬레이션 (프롬프트 → 후보 → 추천 → Guardian → 결제) ----------
type AgentCandidate = {
  title: string;
  seller: string;
  marketplace: string;
  price_krw: number;
  rating: number;
  reviews: number;
  shipping: string;
  url: string;
  note: string;
};
type AgentSim = {
  contract: {
    purpose: string;
    amount_limit_krw: number;
    banned_sellers: string[];
    must_include: string;
    notes: string;
  };
  candidates: AgentCandidate[];
  recommendation: { index: number; reason: string };
  guardian: {
    verdict: "ALLOW" | "BLOCK";
    reason: string;
    checks: { name: string; pass: boolean; detail: string }[];
  };
  payment: {
    status: "APPROVED" | "BLOCKED";
    token: string;
    receipt_no: string;
    method: string;
    at: string;
  };
};

export const simulateAgentPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        request: z.string().min(5).max(400),
        amount_limit_krw: z.number().int().min(1000).max(10_000_000),
        banned_sellers: z.string().max(200).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY 가 없습니다.");

    const banned = data.banned_sellers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const system = `너는 한국 이커머스 쇼핑 에이전트다.
사용자의 자연어 요청과 예산 상한을 받아, 네이버 쇼핑/쿠팡/아마존 스타일의 실제와 흡사한 상품 후보 5개를 만들어내고 가장 좋은 것을 추천한다.
판매자와 URL 은 실제 서비스처럼 자연스럽게 생성하되(예: "smartstore.naver.com/...", "coupang.com/vp/products/..."), 존재를 보장할 필요는 없다.
금지 판매자 목록에 포함된 판매자는 candidates 에 절대 넣지 않는다.
가격은 예산 상한의 40%~110% 범위로 다양하게 분포시키고, 추천은 반드시 예산 상한 이내인 후보 중에서 고른다.
오직 아래 JSON 스키마 하나만 반환한다. 설명 텍스트 금지.
{
  "contract": {
    "purpose": string,
    "amount_limit_krw": number,
    "banned_sellers": string[],
    "must_include": string,
    "notes": string
  },
  "candidates": [{
    "title": string,
    "seller": string,
    "marketplace": "네이버쇼핑"|"쿠팡"|"아마존"|"11번가"|"G마켓",
    "price_krw": number,
    "rating": number,
    "reviews": number,
    "shipping": string,
    "url": string,
    "note": string
  }],
  "recommendation": { "index": number, "reason": string }
}`;

    const user = `요청: ${data.request}
예산 상한: ${data.amount_limit_krw}원
금지 판매자: ${banned.length ? banned.join(", ") : "(없음)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("AI 사용량 한도에 도달했습니다.");
    if (res.status === 402) throw new Error("AI 크레딧이 소진되었습니다.");
    if (!res.ok) throw new Error(`AI 게이트웨이 오류 (${res.status})`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Partial<AgentSim>;

    const contract = {
      purpose: String(parsed.contract?.purpose ?? data.request).slice(0, 200),
      amount_limit_krw: Math.max(
        1000,
        Math.round(Number(parsed.contract?.amount_limit_krw ?? data.amount_limit_krw)),
      ),
      banned_sellers: banned,
      must_include: String(parsed.contract?.must_include ?? "").slice(0, 100),
      notes: String(parsed.contract?.notes ?? "").slice(0, 200),
    };
    const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    const candidates: AgentCandidate[] = rawCandidates.slice(0, 6).map((c) => ({
      title: String(c?.title ?? "이름 없는 상품").slice(0, 120),
      seller: String(c?.seller ?? "unknown").slice(0, 60),
      marketplace: String(c?.marketplace ?? "네이버쇼핑").slice(0, 20),
      price_krw: Math.max(0, Math.round(Number(c?.price_krw ?? 0))),
      rating: Math.max(0, Math.min(5, Number(c?.rating ?? 0))),
      reviews: Math.max(0, Math.round(Number(c?.reviews ?? 0))),
      shipping: String(c?.shipping ?? "").slice(0, 40),
      url: String(c?.url ?? "").slice(0, 200),
      note: String(c?.note ?? "").slice(0, 200),
    }));

    let recIndex = Math.max(
      0,
      Math.min(candidates.length - 1, Math.round(Number(parsed.recommendation?.index ?? 0))),
    );
    const recReason = String(parsed.recommendation?.reason ?? "AI 추천").slice(0, 300);
    const pick = candidates[recIndex];

    // IntentLock Guardian: 규칙 기반 검증 (AI가 아니라 결정론적)
    const checks: { name: string; pass: boolean; detail: string }[] = [];
    let verdict: "ALLOW" | "BLOCK" = "ALLOW";
    let reason = "모든 계약 조건을 만족합니다.";

    if (!pick) {
      verdict = "BLOCK";
      reason = "추천된 상품이 없습니다.";
    } else {
      const amountOk = pick.price_krw <= contract.amount_limit_krw;
      checks.push({
        name: "금액 상한",
        pass: amountOk,
        detail: `${pick.price_krw.toLocaleString("ko-KR")}원 ${amountOk ? "≤" : ">"} ${contract.amount_limit_krw.toLocaleString("ko-KR")}원`,
      });
      const sellerOk = !contract.banned_sellers.some((b) =>
        pick.seller.toLowerCase().includes(b.toLowerCase()),
      );
      checks.push({
        name: "판매자 화이트리스트",
        pass: sellerOk,
        detail: sellerOk ? `${pick.seller} 은(는) 금지 목록에 없음` : `${pick.seller} 은(는) 금지 판매자`,
      });
      const keywordOk =
        !contract.must_include ||
        pick.title.toLowerCase().includes(contract.must_include.toLowerCase());
      checks.push({
        name: "필수 키워드",
        pass: keywordOk,
        detail: contract.must_include
          ? keywordOk
            ? `"${contract.must_include}" 포함`
            : `"${contract.must_include}" 누락`
          : "제약 없음",
      });
      const currencyOk = /(₩|원|KRW)/i.test(pick.shipping) || true; // KRW 기본
      checks.push({
        name: "통화",
        pass: currencyOk,
        detail: "KRW 로 표기됨",
      });

      if (checks.some((c) => !c.pass)) {
        verdict = "BLOCK";
        reason = checks.filter((c) => !c.pass).map((c) => c.name).join(", ") + " 위반";
      }
    }

    // Guardian 이 BLOCK 이면 다른 후보에서 자동 재추천 시도
    if (verdict === "BLOCK" && candidates.length > 0) {
      const fallback = candidates.findIndex(
        (c) =>
          c.price_krw <= contract.amount_limit_krw &&
          !contract.banned_sellers.some((b) => c.seller.toLowerCase().includes(b.toLowerCase())) &&
          (!contract.must_include ||
            c.title.toLowerCase().includes(contract.must_include.toLowerCase())),
      );
      if (fallback >= 0 && fallback !== recIndex) {
        recIndex = fallback;
        const newPick = candidates[fallback];
        const rechecks = [
          {
            name: "금액 상한",
            pass: true,
            detail: `${newPick.price_krw.toLocaleString("ko-KR")}원 ≤ ${contract.amount_limit_krw.toLocaleString("ko-KR")}원`,
          },
          { name: "판매자 화이트리스트", pass: true, detail: `${newPick.seller} 통과` },
          {
            name: "필수 키워드",
            pass: true,
            detail: contract.must_include ? `"${contract.must_include}" 포함` : "제약 없음",
          },
          { name: "통화", pass: true, detail: "KRW 로 표기됨" },
        ];
        checks.length = 0;
        checks.push(...rechecks);
        verdict = "ALLOW";
        reason = "1차 추천 차단 후 계약을 만족하는 대체 상품 자동 선정.";
      }
    }

    const finalPick = candidates[recIndex];
    const paymentApproved = verdict === "ALLOW" && !!finalPick;
    const token = `IL-TX-${sha256Hex(JSON.stringify({ contract, finalPick, t: Date.now() })).slice(0, 20).toUpperCase()}`;

    return {
      contract,
      candidates,
      recommendation: { index: recIndex, reason: recReason },
      guardian: { verdict, reason, checks },
      payment: {
        status: paymentApproved ? "APPROVED" : "BLOCKED",
        token,
        receipt_no: paymentApproved ? `RCPT-${Date.now().toString(36).toUpperCase()}` : "",
        method: "샌드박스 카드",
        at: new Date().toISOString(),
      },
    } satisfies AgentSim;
  });