import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/intentlock.functions";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({
    meta: [
      { title: "구매 내역 · IntentLock" },
      { name: "description", content: "IntentLock 결제·이용권 내역" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PurchasesPage,
});

type OrderRow = {
  id: string;
  order_no: string;
  product_name: string;
  amount_krw: number;
  status: string;
  created_at: string;
  payments: Array<{ status: string; method: string | null; receipt_no: string | null; approved_at: string | null }>;
  entitlements: Array<{ status: string; reports_remaining: number; expires_at: string }>;
  cancellation_requests: Array<{ reason: string; completed_at: string | null }>;
};

function PurchasesPage() {
  const run = useServerFn(listMyOrders);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => run(),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">구매 내역</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">주문과 이용권</h1>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">불러오는 중…</p>}
      {error && (
        <p className="mt-8 rounded-md border border-border bg-muted px-4 py-3 text-sm">
          {(error as Error).message}
        </p>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">아직 주문이 없습니다.</p>
          <Link
            to="/checkout"
            className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-xs font-medium text-background"
          >
            Beta Pass 구매하기
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {(data as OrderRow[] | undefined)?.map((o) => {
          const pay = o.payments?.[0];
          const ent = o.entitlements?.[0];
          const cancel = o.cancellation_requests?.[0];
          return (
            <article key={o.id} className="rounded-lg border border-border bg-background p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">{o.order_no}</div>
                  <div className="mt-1 text-lg font-semibold tracking-tight">{o.product_name}</div>
                </div>
                <StatusPill label={o.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-4">
                <dt className="text-muted-foreground">금액</dt>
                <dd>₩{o.amount_krw.toLocaleString("ko-KR")}</dd>
                <dt className="text-muted-foreground">주문일시</dt>
                <dd>{new Date(o.created_at).toLocaleString("ko-KR")}</dd>
                {pay && (
                  <>
                    <dt className="text-muted-foreground">결제 수단</dt>
                    <dd>{pay.method}</dd>
                    <dt className="text-muted-foreground">영수증</dt>
                    <dd className="font-mono">{pay.receipt_no}</dd>
                  </>
                )}
                {ent && (
                  <>
                    <dt className="text-muted-foreground">잔여 리포트</dt>
                    <dd>{ent.reports_remaining}건</dd>
                    <dt className="text-muted-foreground">만료</dt>
                    <dd>{new Date(ent.expires_at).toLocaleDateString("ko-KR")}</dd>
                  </>
                )}
                {cancel && (
                  <>
                    <dt className="text-muted-foreground">취소 사유</dt>
                    <dd className="col-span-3">{cancel.reason}</dd>
                  </>
                )}
              </dl>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function StatusPill({ label }: { label: string }) {
  const emphasized = label === "FULFILLED" || label === "PAID";
  return (
    <span
      className={
        "rounded-full px-3 py-1 text-[10px] uppercase tracking-widest " +
        (emphasized
          ? "bg-foreground text-background"
          : "border border-border text-muted-foreground")
      }
    >
      {label}
    </span>
  );
}