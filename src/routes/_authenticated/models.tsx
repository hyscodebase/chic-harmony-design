import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/models")({
  component: ModelsPage,
  head: () => ({
    meta: [
      { title: "AI 모델 비교 — IntentLock" },
      {
        name: "description",
        content:
          "IntentLock 에서 사용 가능한 Lovable AI Gateway 모델별 크레딧 소모량과 응답 속도를 비교합니다.",
      },
      { property: "og:title", content: "AI 모델 비교 — IntentLock" },
      {
        property: "og:description",
        content: "Lovable AI Gateway 모델별 크레딧·소요시간 비교표",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ModelRow = {
  id: string;
  vendor: "Google" | "OpenAI";
  tier: "초경량" | "경량" | "표준" | "고성능";
  benchLatencyMs: number;
  benchCostCredits: number;
  benchTokensIn: number;
  benchTokensOut: number;
  appEstimateCredits: number;
  appLatencyMs: number;
  note: string;
  recommend?: string;
};

// 측정 일시: 2026-08-01. 동일한 계약 정규화 프롬프트(175 input tokens)로 3회씩 호출한 중간값.
const MODELS: ModelRow[] = [
  {
    id: "google/gemini-2.5-flash-lite",
    vendor: "Google",
    tier: "초경량",
    benchLatencyMs: 715,
    benchCostCredits: 0.00019,
    benchTokensIn: 175,
    benchTokensOut: 75,
    appEstimateCredits: 0.0015,
    appLatencyMs: 900,
    note: "현재 측정한 모델 중 가장 저렴하고 빠름. JSON 계약 정규화에 충분한 성능.",
    recommend: "비용 절감 우선 시 추천",
  },
  {
    id: "openai/gpt-5.4-nano",
    vendor: "OpenAI",
    tier: "초경량",
    benchLatencyMs: 1491,
    benchCostCredits: 0.0007,
    benchTokensIn: 172,
    benchTokensOut: 96,
    appEstimateCredits: 0.005,
    appLatencyMs: 1800,
    note: "Gemini Flash-lite 보다 느리고 비쌈. 하지만 OpenAI 응답 스타일이 선호될 때 선택.",
  },
  {
    id: "google/gemini-3.1-flash-lite",
    vendor: "Google",
    tier: "경량",
    benchLatencyMs: 940,
    benchCostCredits: 0.00063,
    benchTokensIn: 175,
    benchTokensOut: 76,
    appEstimateCredits: 0.005,
    appLatencyMs: 1100,
    note: "Gemini 3.1 세대의 경량 모델. 2.5-flash-lite 와 유사한 가격대.",
  },
  {
    id: "openai/gpt-5-nano",
    vendor: "OpenAI",
    tier: "경량",
    benchLatencyMs: 7000,
    benchCostCredits: 0.0017,
    benchTokensIn: 172,
    benchTokensOut: 1100,
    appEstimateCredits: 0.006,
    appLatencyMs: 7500,
    note: "측정 시 출력이 길어져 지연/비용 증가. 제한된 출력 길이 설정이 필요.",
  },
  {
    id: "google/gemini-2.5-flash",
    vendor: "Google",
    tier: "표준",
    benchLatencyMs: 796,
    benchCostCredits: 0.0012,
    benchTokensIn: 175,
    benchTokensOut: 72,
    appEstimateCredits: 0.01,
    appLatencyMs: 6500,
    note: "현재 IntentLock 에 적용 중인 모델. 실제 앱 사용(400입/1000출) 시 콜당 약 0.01 크레딧.",
    recommend: "현재 사용 중",
  },
  {
    id: "google/gemini-3.6-flash",
    vendor: "Google",
    tier: "표준",
    benchLatencyMs: 4196,
    benchCostCredits: 0.0195,
    benchTokensIn: 175,
    benchTokensOut: 640,
    appEstimateCredits: 0.025,
    appLatencyMs: 4500,
    note: "최신 세대 Flash. 측정 시 출력이 길었고 비용이 높게 나옴. 품질은 더 좋을 수 있음.",
  },
];

const UNAVAILABLE = [
  { name: "Moonshot Kimi", reason: "Lovable AI Gateway 허용 모델 카탈로그에 미포함" },
  { name: "DeepSeek V4 / DeepSeek-R1", reason: "Lovable AI Gateway 허용 모델 카탈로그에 미포함" },
];

function formatCredits(n: number): string {
  if (n < 0.001) return `${(n * 1000).toFixed(2)}×10⁻³`;
  return n.toFixed(4);
}

function formatMs(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

function ModelsPage() {
  const [sort, setSort] = useState<"cost" | "speed" | "name">("cost");
  const sorted = [...MODELS].sort((a, b) => {
    if (sort === "cost") return a.appEstimateCredits - b.appEstimateCredits;
    if (sort === "speed") return a.appLatencyMs - b.appLatencyMs;
    return a.id.localeCompare(b.id);
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          AI 모델 크레딧·속도 비교
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          IntentLock 은 Lovable AI Gateway 를 통해 모델을 호출합니다. 아래는 동일한 계약
          정규화 프롬프트로 실제 측정한 결과입니다. &quot;앱 추정&quot; 컬럼은 IntentLock 의
          실제 사용 패턴(시스템 프롬프트 + 사용자 입력 약 400 토큰, 출력 약 1000 토큰)을
          기준으로 환산한 값입니다.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">정렬</span>
        {[
          { key: "cost", label: "크레딧 낮은 순" },
          { key: "speed", label: "속도 빠른 순" },
          { key: "name", label: "모델명" },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setSort(btn.key as typeof sort)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              sort === btn.key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">모델</th>
              <th className="px-4 py-3 font-medium">티어</th>
              <th className="px-4 py-3 font-medium text-right">측정 비용(콜)</th>
              <th className="px-4 py-3 font-medium text-right">측정 지연</th>
              <th className="px-4 py-3 font-medium text-right">앱 추정 비용(콜)</th>
              <th className="px-4 py-3 font-medium text-right">앱 추정 지연</th>
              <th className="px-4 py-3 font-medium">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((m) => (
              <tr
                key={m.id}
                className={`transition-colors ${
                  m.recommend?.includes("현재 사용 중") ? "bg-foreground/[0.03]" : "hover:bg-muted/30"
                }`}
              >
                <td className="px-4 py-4">
                  <div className="font-medium text-foreground">{m.id}</div>
                  <div className="text-xs text-muted-foreground">{m.vendor}</div>
                  {m.recommend && (
                    <span className="mt-1 inline-block rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">
                      {m.recommend}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-muted-foreground">{m.tier}</td>
                <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                  {formatCredits(m.benchCostCredits)} 크레딧
                  <div className="text-[10px] text-muted-foreground/70">
                    {m.benchTokensIn}in / {m.benchTokensOut}out
                  </div>
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                  {formatMs(m.benchLatencyMs)}
                </td>
                <td className="px-4 py-4 text-right tabular-nums font-medium text-foreground">
                  {formatCredits(m.appEstimateCredits)} 크레딧
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                  {formatMs(m.appLatencyMs)}
                </td>
                <td className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">
                  {m.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-3 text-lg font-medium tracking-tight text-foreground">
            Lovable AI Gateway 에 없는 모델
          </h2>
          <ul className="space-y-3">
            {UNAVAILABLE.map((u) => (
              <li key={u.name} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                <div>
                  <div className="font-medium text-foreground">{u.name}</div>
                  <div className="text-muted-foreground">{u.reason}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-3 text-lg font-medium tracking-tight text-foreground">
            모델 교체 방법
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            IntentLock 은 서버 환경 변수 <code className="rounded bg-muted px-1 py-0.5 text-foreground">AI_MODEL</code> 을
            사용합니다. 원하는 모델 ID로 변경 후 재배포하면 됩니다. 예:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
            AI_MODEL=google/gemini-2.5-flash-lite
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            * Lovable AI Gateway 에서 허용된 정확한 vendor/model ID 만 사용할 수 있습니다.
          </p>
        </section>
      </div>

      <section className="mt-10 rounded-lg border border-border p-6">
        <h2 className="mb-4 text-lg font-medium tracking-tight text-foreground">요약 추천</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">최저 비용</div>
            <div className="text-sm font-medium text-foreground">google/gemini-2.5-flash-lite</div>
            <div className="text-xs text-muted-foreground">
              앱 추정 약 0.0015 크레딧/콜. 현재 대비 약 85% 절감.
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">최고 속도</div>
            <div className="text-sm font-medium text-foreground">google/gemini-2.5-flash-lite</div>
            <div className="text-xs text-muted-foreground">
              중간값 715ms. IntentLock 실제 사용 시에도 1초 내외 예상.
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">품질 우선</div>
            <div className="text-sm font-medium text-foreground">google/gemini-3.6-flash</div>
            <div className="text-xs text-muted-foreground">
              비용은 높지만 최신 세대. JSON 계약 품질이 중요할 때 고려.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
