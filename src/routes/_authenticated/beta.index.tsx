import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getMyEntitlement,
  listMyReports,
  generateGuardianReport,
} from "@/lib/intentlock.functions";

export const Route = createFileRoute("/_authenticated/beta/")({
  head: () => ({
    meta: [
      { title: "Beta Pass · IntentLock" },
      { name: "description", content: "Guardian 리포트를 생성하고 조회하세요." },
      { property: "og:title", content: "Beta Pass · IntentLock" },
      { property: "og:description", content: "Guardian 리포트를 생성하고 조회하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://intentlock.kro.kr/intentlock-share.jpg" },
      { name: "twitter:image", content: "https://intentlock.kro.kr/intentlock-share.jpg" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BetaPage,
});

type Entitlement = {
  id: string;
  status: string;
  reports_remaining: number;
  expires_at: string;
};
type Report = {
  id: string;
  created_at: string;
  verdict: string;
  reason: string;
  proposed_amount_krw: number;
  proposed_purpose: string;
};

function BetaPage() {
  const qc = useQueryClient();
  const runEnt = useServerFn(getMyEntitlement);
  const runList = useServerFn(listMyReports);
  const runGen = useServerFn(generateGuardianReport);

  const ent = useQuery({ queryKey: ["entitlement"], queryFn: () => runEnt() });
  const reports = useQuery({ queryKey: ["reports"], queryFn: () => runList() });

  const [scenario, setScenario] = useState(
    "친구가 급하다며 편의점 상품권 5만원어치를 대신 사달라고 부탁했습니다. 원래 계약된 목적과 다릅니다.",
  );
  const [amount, setAmount] = useState(50000);
  const [purpose, setPurpose] = useState("상품권 대리 구매");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const e = ent.data as Entitlement | null;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!e) return;
    setBusy(true);
    setErr(null);
    try {
      await runGen({
        data: {
          entitlement_id: e.id,
          scenario,
          proposed_amount_krw: amount,
          proposed_purpose: purpose,
        },
      });
      await qc.invalidateQueries({ queryKey: ["entitlement"] });
      await qc.invalidateQueries({ queryKey: ["reports"] });
    } catch (er) {
      setErr(er instanceof Error ? er.message : String(er));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Beta Pass</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Guardian 리포트</h1>

      {ent.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">불러오는 중…</p>
      ) : e ? (
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          <Metric title="잔여 리포트" value={`${e.reports_remaining}건`} />
          <Metric title="상태" value={e.status} />
          <Metric title="만료" value={new Date(e.expires_at).toLocaleDateString("ko-KR")} />
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">활성 Beta Pass 가 없습니다.</p>
          <Link
            to="/checkout"
            className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-xs font-medium text-background"
          >
            구매하기
          </Link>
        </div>
      )}

      {e && e.reports_remaining > 0 && (
        <form
          onSubmit={submit}
          className="mt-10 space-y-4 rounded-lg border border-border bg-background p-6"
        >
          <h2 className="text-lg font-semibold tracking-tight">새 리포트 요청</h2>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              시나리오
            </span>
            <textarea
              value={scenario}
              onChange={(ev) => setScenario(ev.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                제안 목적
              </span>
              <input
                value={purpose}
                onChange={(ev) => setPurpose(ev.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                제안 금액 (원)
              </span>
              <input
                type="number"
                value={amount}
                onChange={(ev) => setAmount(Number(ev.target.value))}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
          {err && (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs">{err}</div>
          )}
          <button
            disabled={busy}
            className="rounded-full bg-foreground px-5 py-2 text-xs font-medium text-background disabled:opacity-50"
          >
            {busy ? "AI 판정 중…" : "Guardian 에게 물어보기"}
          </button>
        </form>
      )}

      <div className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">최근 리포트</h2>
        <div className="mt-4 space-y-3">
          {(reports.data as Report[] | undefined)?.map((r) => (
            <Link
              key={r.id}
              to="/beta/reports/$id"
              params={{ id: r.id }}
              className="block rounded-lg border border-border bg-background p-5 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{r.proposed_purpose}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ₩{r.proposed_amount_krw.toLocaleString("ko-KR")} ·{" "}
                    {new Date(r.created_at).toLocaleString("ko-KR")}
                  </div>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-[10px] uppercase tracking-widest " +
                    (r.verdict === "ALLOW"
                      ? "bg-foreground text-background"
                      : "border border-border")
                  }
                >
                  {r.verdict}
                </span>
              </div>
            </Link>
          ))}
          {reports.data && (reports.data as Report[]).length === 0 && (
            <p className="text-sm text-muted-foreground">아직 요청한 리포트가 없습니다.</p>
          )}
        </div>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-background px-6 py-6">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
