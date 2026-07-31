import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/intentlock.functions";

export const Route = createFileRoute("/_authenticated/beta/reports/$id")({
  head: () => ({
    meta: [
      { title: "Guardian 리포트 · IntentLock" },
      { name: "description", content: "Guardian 판정 결과 상세" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportDetail,
});

type Report = {
  id: string;
  created_at: string;
  verdict: string;
  reason: string;
  scenario: string;
  proposed_amount_krw: number;
  proposed_purpose: string;
};

function ReportDetail() {
  const { id } = useParams({ from: "/_authenticated/beta/reports/$id" });
  const run = useServerFn(getReport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["report", id],
    queryFn: () => run({ data: { id } }),
  });
  const r = data as Report | undefined;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/beta" className="text-xs text-muted-foreground hover:text-foreground">
        ← Beta Pass 로 돌아가기
      </Link>
      {isLoading && <p className="mt-8 text-sm text-muted-foreground">불러오는 중…</p>}
      {error && (
        <p className="mt-8 rounded-md border border-border bg-muted px-4 py-3 text-sm">
          {(error as Error).message}
        </p>
      )}
      {r && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <span
              className={
                "rounded-full px-3 py-1 text-[10px] uppercase tracking-widest " +
                (r.verdict === "ALLOW" ? "bg-foreground text-background" : "border border-border")
              }
            >
              {r.verdict}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString("ko-KR")}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{r.proposed_purpose}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            제안 금액 · ₩{r.proposed_amount_krw.toLocaleString("ko-KR")}
          </p>
          <section className="mt-8 rounded-lg border border-border bg-background p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">시나리오</div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{r.scenario}</p>
          </section>
          <section className="mt-4 rounded-lg border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Guardian 판정
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{r.reason}</p>
          </section>
        </>
      )}
    </main>
  );
}
