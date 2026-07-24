import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { simulateAgentPurchase } from "@/lib/intentlock.functions";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentPage,
  head: () => ({
    meta: [
      { title: "AI 쇼핑 에이전트 — IntentLock" },
      {
        name: "description",
        content:
          "자연어로 원하는 물건을 요청하면 AI가 네이버·쿠팡·아마존에서 후보를 찾아 추천하고, IntentLock 이 계약 상한과 금지 판매자를 검증해 결제 여부를 결정합니다.",
      },
      { property: "og:title", content: "AI 쇼핑 에이전트 — IntentLock" },
      {
        property: "og:description",
        content: "AI 는 상품을 찾고, IntentLock 은 넘어서는 안 될 선을 지킵니다.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-destructive">
      에이전트 오류: {String((error as Error)?.message ?? error)}
    </div>
  ),
  notFoundComponent: () => <div className="mx-auto max-w-2xl px-6 py-16">페이지를 찾을 수 없습니다.</div>,
});

type Sim = Awaited<ReturnType<typeof simulateAgentPurchase>>;

const STAGES = [
  { id: "contract", label: "계약 정규화", detail: "요청을 Intent Contract JSON 으로 변환" },
  { id: "search", label: "상품 후보 검색", detail: "네이버·쿠팡·아마존 후보 수집" },
  { id: "recommend", label: "최적 상품 추천", detail: "AI 가 가격·평점·조건을 종합 선정" },
  { id: "guardian", label: "IntentLock Guardian", detail: "계약 상한·판매자·키워드 검증" },
  { id: "pay", label: "결제 게이트웨이", detail: "허용 시 일회용 토큰 발급, 위반 시 차단" },
] as const;
type StageId = (typeof STAGES)[number]["id"];

function AgentPage() {
  const run = useServerFn(simulateAgentPurchase);
  const [request, setRequest] = useState("무선 노이즈캔슬링 이어폰 갖고 싶어. 배터리 오래가고 리뷰 좋은거로.");
  const [limit, setLimit] = useState(150000);
  const [banned, setBanned] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<Sim | null>(null);
  const [activeStage, setActiveStage] = useState<StageId | null>(null);
  const [doneStages, setDoneStages] = useState<StageId[]>([]);

  useEffect(() => {
    if (!running || !sim) return;
    setDoneStages([]);
    let i = 0;
    setActiveStage(STAGES[0]?.id ?? null);
    const timer = setInterval(() => {
      const current = STAGES[i];
      if (!current) {
        clearInterval(timer);
        setActiveStage(null);
        setRunning(false);
        return;
      }
      setDoneStages((prev) => [...prev, current.id]);
      i += 1;
      const next = STAGES[i];
      if (!next) {
        clearInterval(timer);
        setActiveStage(null);
        setRunning(false);
      } else {
        setActiveStage(next.id);
      }
    }, 850);
    return () => clearInterval(timer);
  }, [running, sim]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSim(null);
    setDoneStages([]);
    setActiveStage("contract");
    setRunning(true);
    try {
      const result = await run({
        data: { request, amount_limit_krw: limit, banned_sellers: banned },
      });
      setSim(result);
    } catch (err) {
      setError((err as Error).message);
      setRunning(false);
      setActiveStage(null);
    }
  }

  const pick =
    sim && sim.candidates && sim.recommendation
      ? sim.candidates[sim.recommendation.index] ?? null
      : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="mb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Agent Sandbox / R1
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          AI 에이전트가 사고, IntentLock 이 선을 지킵니다
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          자연어로 원하는 물건을 말하면 AI 가 네이버쇼핑·쿠팡·아마존에서 후보를 찾아
          최적안을 추천합니다. IntentLock 은 그 결과가 사용자가 승인한 계약(예산 상한,
          금지 판매자, 필수 키워드)을 벗어나면 결제 자체를 차단합니다.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2"
      >
        <label className="md:col-span-2 space-y-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            무엇을 사고 싶나요?
          </span>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={3}
            maxLength={400}
            required
            className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
            placeholder="예: 200만원 이하 40인치대 OLED TV, 삼성/LG 만."
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            예산 상한 (원)
          </span>
          <input
            type="number"
            min={1000}
            step={1000}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            금지 판매자 (쉼표 구분, 선택)
          </span>
          <input
            type="text"
            value={banned}
            onChange={(e) => setBanned(e.target.value)}
            placeholder="예: 알리, 테무"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
          />
        </label>
        <div className="md:col-span-2 flex items-center justify-between border-t border-border pt-4">
          <div className="text-xs text-muted-foreground">
            요청은 <span className="text-foreground">Intent Contract</span> 로 정규화되고,
            IntentLock 이 결제 순간에 다시 검증합니다.
          </div>
          <button
            type="submit"
            disabled={running}
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {running ? "에이전트 작동 중..." : "에이전트 실행"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {(running || sim) && (
        <section className="mt-10 space-y-3">
          {STAGES.map((s, idx) => {
            const done = doneStages.includes(s.id);
            const active = activeStage === s.id;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                  done
                    ? "border-foreground/30 bg-card"
                    : active
                      ? "border-foreground bg-card"
                      : "border-border/60 bg-card/40"
                }`}
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-mono ${
                    done
                      ? "border-foreground bg-foreground text-background"
                      : active
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : String(idx + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.detail}</div>
                </div>
                {active && (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    진행 중
                  </span>
                )}
              </div>
            );
          })}
        </section>
      )}

      {sim && !running && (
        <div className="mt-10 space-y-8">
          {/* Intent Contract */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">1. Intent Contract</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                AI 정규화
              </span>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-background p-4 text-xs leading-relaxed">
{JSON.stringify(sim.contract, null, 2)}
            </pre>
          </section>

          {/* Candidates */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                2. 검색된 상품 후보 · {sim.candidates.length}개
              </h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                에이전트 크롤링 시뮬레이션
              </span>
            </div>
            <div className="grid gap-3">
              {(sim.candidates ?? []).map((c, i) => {
                const isPick = i === sim.recommendation?.index;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 ${
                      isPick ? "border-foreground bg-background" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                          <span>{c.marketplace}</span>
                          <span>·</span>
                          <span>{c.seller}</span>
                          {isPick && (
                            <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                              추천
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium">{c.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          ★ {c.rating.toFixed(1)} · 리뷰 {c.reviews.toLocaleString("ko-KR")} ·{" "}
                          {c.shipping || "배송 정보 없음"}
                        </div>
                        {c.note && (
                          <div className="mt-1 text-xs text-muted-foreground">{c.note}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold tracking-tight">
                          {c.price_krw.toLocaleString("ko-KR")}원
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {pick && (
              <div className="mt-4 rounded-lg border border-border/60 bg-background p-3 text-xs text-muted-foreground">
                <span className="text-foreground">추천 사유 · </span>
                {sim.recommendation?.reason ?? "—"}
              </div>
            )}
          </section>

          {/* Guardian */}
          <section
            className={`rounded-2xl border p-6 ${
              sim.guardian?.verdict === "ALLOW"
                ? "border-foreground bg-card"
                : "border-destructive/60 bg-destructive/5"
            }`}
          >
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">3. Guardian 판정</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  sim.guardian?.verdict === "ALLOW"
                    ? "bg-foreground text-background"
                    : "bg-destructive text-destructive-foreground"
                }`}
              >
                {sim.guardian?.verdict ?? "—"}
              </span>
            </div>
            <div className="space-y-2">
              {(sim.guardian?.checks ?? []).map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-mono ${
                        c.pass
                          ? "bg-foreground text-background"
                          : "bg-destructive text-destructive-foreground"
                      }`}
                    >
                      {c.pass ? "✓" : "✕"}
                    </span>
                    <span className="font-medium">{c.name}</span>
                  </span>
                  <span className="text-muted-foreground">{c.detail}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <span className="text-foreground">사유 · </span>
              {sim.guardian?.reason ?? "—"}
            </div>
          </section>

          {/* Payment */}
          <section
            className={`rounded-2xl border p-6 ${
              sim.payment?.status === "APPROVED"
                ? "border-foreground bg-background"
                : "border-destructive/60 bg-destructive/5"
            }`}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">4. 결제 게이트웨이</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {sim.payment?.status === "APPROVED" ? "일회용 토큰 발급" : "차단됨"}
              </span>
            </div>
            {sim.payment?.status === "APPROVED" && pick ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 text-xs">
                  <Row label="상품" value={pick.title} />
                  <Row label="판매자" value={`${pick.marketplace} · ${pick.seller}`} />
                  <Row
                    label="결제 금액"
                    value={`${pick.price_krw.toLocaleString("ko-KR")}원`}
                  />
                  <Row label="계약 상한" value={`${(sim.contract?.amount_limit_krw ?? 0).toLocaleString("ko-KR")}원`} />
                  <Row label="결제 수단" value={sim.payment.method} />
                  <Row label="영수증 번호" value={sim.payment.receipt_no} />
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    일회용 결제 토큰
                  </div>
                  <div className="mt-2 break-all font-mono text-xs">{sim.payment?.token}</div>
                  <div className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    이 토큰은 방금의 계약·상품·금액에만 유효합니다. 판매자·금액이 1원이라도
                    다르면 결제 시스템이 즉시 거부합니다.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-destructive">
                IntentLock 이 결제 시도를 차단했습니다. 계약 조건을 조정한 뒤 다시 시도하세요.
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}