import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { checkOperatorRole, operatorListOrders, operatorCancel } from "@/lib/intentlock.functions";

export const Route = createFileRoute("/_authenticated/operator")({
  head: () => ({
    meta: [
      { title: "운영자 · IntentLock" },
      { name: "description", content: "운영자 전용 주문 관리 도구" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperatorPage,
});

type OrderRow = {
  id: string;
  order_no: string;
  product_name: string;
  amount_krw: number;
  status: string;
  created_at: string;
  payments: Array<{ status: string; method: string | null }>;
  cancellation_requests: Array<{ reason: string }>;
};

function OperatorPage() {
  const runRole = useServerFn(checkOperatorRole);
  const runList = useServerFn(operatorListOrders);
  const runCancel = useServerFn(operatorCancel);
  const qc = useQueryClient();

  const role = useQuery({ queryKey: ["operator-role"], queryFn: () => runRole() });
  const isOp = (role.data as { isOperator: boolean } | undefined)?.isOperator ?? false;

  const orders = useQuery({
    queryKey: ["operator-orders"],
    queryFn: () => runList(),
    enabled: isOp,
  });

  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function cancel(orderId: string) {
    const reason = (reasonById[orderId] ?? "").trim();
    if (reason.length < 10) {
      setErr("취소 사유는 10자 이상 입력해 주세요.");
      return;
    }
    setBusyId(orderId);
    setErr(null);
    try {
      await runCancel({
        data: { order_id: orderId, reason, idempotency_key: crypto.randomUUID() },
      });
      await qc.invalidateQueries({ queryKey: ["operator-orders"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  if (role.isLoading) {
    return <main className="mx-auto max-w-5xl px-6 py-16 text-sm text-muted-foreground">권한 확인 중…</main>;
  }
  if (!isOp) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">운영자 전용</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          이 페이지는 운영자 권한이 필요합니다.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">운영자 콘솔</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">주문 관리</h1>
      {err && (
        <div className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-xs">{err}</div>
      )}
      <div className="mt-8 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">주문</th>
              <th className="px-4 py-3 text-left">상품</th>
              <th className="px-4 py-3 text-left">금액</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">취소</th>
            </tr>
          </thead>
          <tbody>
            {(orders.data as OrderRow[] | undefined)?.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-4 font-mono text-xs">
                  {o.order_no}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("ko-KR")}
                  </div>
                </td>
                <td className="px-4 py-4">{o.product_name}</td>
                <td className="px-4 py-4">₩{o.amount_krw.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-4">
                  <span
                    className={
                      "rounded-full px-2 py-1 text-[10px] uppercase tracking-widest " +
                      (o.status === "CANCELED"
                        ? "border border-border text-muted-foreground"
                        : "bg-foreground text-background")
                    }
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {o.status === "CANCELED" ? (
                    <span className="text-xs text-muted-foreground">
                      {o.cancellation_requests[0]?.reason ?? "취소됨"}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <input
                        placeholder="취소 사유 (10자 이상)"
                        value={reasonById[o.id] ?? ""}
                        onChange={(e) =>
                          setReasonById((s) => ({ ...s, [o.id]: e.target.value }))
                        }
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring md:w-56"
                      />
                      <button
                        onClick={() => cancel(o.id)}
                        disabled={busyId === o.id}
                        className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                      >
                        {busyId === o.id ? "취소 중…" : "전액 취소"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}