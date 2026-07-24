import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  createOrder,
  createContract,
  approveContract,
  guardCheckout,
  mockConfirmPayment,
  getBetaPassProduct,
} from "@/lib/intentlock.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "구매 · IntentLock Beta Pass" },
      { name: "description", content: "Intent Contract 를 승인하고 Beta Pass 를 구매합니다." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type Product = { id: string; name: string; description: string; amount_krw: number; purpose: string };
type Order = { id: string; order_no: string; amount_krw: number; status: string };
type Contract = {
  id: string;
  version: number;
  fingerprint: string;
  purpose: string;
  amount_limit_krw: number;
  normalized: unknown;
  status: string;
  policy_verdict: string | null;
  policy_reason: string | null;
  expires_at: string;
};

function CheckoutPage() {
  const navigate = useNavigate();
  const fetchProduct = useServerFn(getBetaPassProduct);
  const runCreateOrder = useServerFn(createOrder);
  const runCreateContract = useServerFn(createContract);
  const runApprove = useServerFn(approveContract);
  const runGuard = useServerFn(guardCheckout);
  const runConfirm = useServerFn(mockConfirmPayment);

  const [product, setProduct] = useState<Product | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [naturalLanguage, setNaturalLanguage] = useState(
    "IntentLock Beta Pass 를 1,000원에 1회 구매하겠습니다. 30일 동안 Guardian 리포트를 사용합니다.",
  );
  const [guard, setGuard] = useState<{ verdict: string; reason: string } | null>(null);
  const [method, setMethod] = useState<"카드" | "계좌이체" | "간편결제">("계좌이체");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    fetchProduct().then((p) => setProduct(p as Product)).catch((e) => setErr(String(e)));
  }, [fetchProduct]);

  async function stepOrder() {
    setBusy("order");
    setErr(null);
    try {
      const r = await runCreateOrder({ data: { idempotency_key: idempotencyKey } });
      setOrder(r.order as Order);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function stepContract() {
    if (!order) return;
    setBusy("contract");
    setErr(null);
    try {
      const r = await runCreateContract({
        data: { order_id: order.id, natural_language: naturalLanguage },
      });
      setContract(r.contract as Contract);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function stepApprove() {
    if (!contract) return;
    setBusy("approve");
    setErr(null);
    try {
      const r = await runApprove({
        data: { contract_id: contract.id, fingerprint: contract.fingerprint },
      });
      setContract(r.contract as Contract);
      if (order) {
        const g = await runGuard({ data: { order_id: order.id } });
        setGuard(g);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function stepPay() {
    if (!order) return;
    setBusy("pay");
    setErr(null);
    try {
      await runConfirm({ data: { order_id: order.id, method } });
      navigate({ to: "/purchases" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!product) {
    return <main className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">불러오는 중…</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Guarded Checkout</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {product.name} 구매
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{product.description}</p>

      {err && (
        <div className="mt-6 rounded-md border border-border bg-muted px-4 py-3 text-sm">
          <span className="font-medium">오류</span> · {err}
        </div>
      )}

      <ol className="mt-10 space-y-6">
        <StepCard
          n="01"
          title="주문 생성"
          state={order ? "done" : "active"}
          body={
            order ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <dt className="text-muted-foreground">주문번호</dt>
                <dd className="font-mono">{order.order_no}</dd>
                <dt className="text-muted-foreground">금액</dt>
                <dd>₩{order.amount_krw.toLocaleString("ko-KR")}</dd>
                <dt className="text-muted-foreground">상태</dt>
                <dd>{order.status}</dd>
              </dl>
            ) : (
              <button
                onClick={stepOrder}
                disabled={busy !== null}
                className="rounded-full bg-foreground px-5 py-2 text-xs font-medium text-background disabled:opacity-50"
              >
                {busy === "order" ? "생성 중…" : "서버에서 주문 생성"}
              </button>
            )
          }
        />

        <StepCard
          n="02"
          title="Intent Contract 승인"
          state={contract?.status === "APPROVED" ? "done" : order ? "active" : "idle"}
          body={
            order ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    자연어 계약
                  </span>
                  <textarea
                    value={naturalLanguage}
                    onChange={(e) => setNaturalLanguage(e.target.value)}
                    rows={3}
                    disabled={contract?.status === "APPROVED"}
                    className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                </label>
                {!contract && (
                  <button
                    onClick={stepContract}
                    disabled={busy !== null}
                    className="rounded-full border border-border px-5 py-2 text-xs font-medium hover:bg-accent"
                  >
                    {busy === "contract" ? "정규화 중…" : "AI 정규화 · 정책 판정"}
                  </button>
                )}
                {contract && (
                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-muted-foreground">
                      <span className="font-mono">contract.v{contract.version}</span>
                      <span>{contract.status}</span>
                    </div>
                    <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed">
{JSON.stringify(
  { purpose: contract.purpose, amount_limit_krw: contract.amount_limit_krw, normalized: contract.normalized },
  null,
  2,
)}
                    </pre>
                    <div className="mt-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">지문 · </span>
                        <span className="font-mono">{contract.fingerprint.slice(0, 24)}…</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-muted-foreground">정책 · </span>
                        {contract.policy_verdict} — {contract.policy_reason}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        만료 · {new Date(contract.expires_at).toLocaleString("ko-KR")}
                      </div>
                    </div>
                    {contract.status === "PENDING" && (
                      <button
                        onClick={stepApprove}
                        disabled={busy !== null || contract.policy_verdict !== "PASS"}
                        className="mt-4 rounded-full bg-foreground px-5 py-2 text-xs font-medium text-background disabled:opacity-50"
                      >
                        {busy === "approve" ? "승인 중…" : "이 계약을 승인합니다"}
                      </button>
                    )}
                    {contract.status === "APPROVED" && (
                      <div className="mt-4 inline-flex items-center gap-2 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground" /> 승인 완료
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">먼저 주문을 생성하세요.</p>
            )
          }
        />

        <StepCard
          n="03"
          title="Guardian 판정"
          state={guard?.verdict === "ALLOW" ? "done" : contract?.status === "APPROVED" ? "active" : "idle"}
          body={
            guard ? (
              <div className="rounded-md border border-border bg-card p-4 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      guard.verdict === "ALLOW"
                        ? "rounded-full bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-widest text-background"
                        : "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest"
                    }
                  >
                    {guard.verdict}
                  </span>
                  <span className="text-muted-foreground">{guard.reason}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">계약 승인 후 자동 판정됩니다.</p>
            )
          }
        />

        <StepCard
          n="04"
          title="결제 승인 (샌드박스)"
          state={guard?.verdict === "ALLOW" ? "active" : "idle"}
          body={
            guard?.verdict === "ALLOW" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(["카드", "계좌이체", "간편결제"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={
                        "rounded-full border px-4 py-1.5 text-xs " +
                        (method === m
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-accent")
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  onClick={stepPay}
                  disabled={busy !== null}
                  className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-50"
                >
                  {busy === "pay" ? "승인 중…" : `₩${product.amount_krw.toLocaleString("ko-KR")} 결제 승인`}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  실제 토스페이먼츠 대신 통제된 모의 승인이 실행됩니다. 주문·계약·금액은 트랜잭션 안에서 다시 검증됩니다.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Guardian ALLOW 판정 후 활성화됩니다.</p>
            )
          }
        />
      </ol>
    </main>
  );
}

function StepCard({
  n,
  title,
  state,
  body,
}: {
  n: string;
  title: string;
  state: "idle" | "active" | "done";
  body: React.ReactNode;
}) {
  return (
    <li className="grid gap-4 rounded-lg border border-border bg-background p-6 md:grid-cols-[120px_1fr]">
      <div>
        <div className="text-xs text-muted-foreground">단계 {n}</div>
        <div className="mt-1 text-lg font-semibold tracking-tight">{title}</div>
        <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          {state === "done" ? "완료" : state === "active" ? "진행" : "대기"}
        </div>
      </div>
      <div>{body}</div>
    </li>
  );
}