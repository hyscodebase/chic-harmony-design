import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntentLock — 승인한 구매만 결제되는 Guarded Checkout" },
      {
        name: "description",
        content:
          "IntentLock 은 자연어로 승인한 계약과 주문 원본을 서버에서 대조해, 계약을 벗어난 결제를 원천 차단합니다.",
      },
      { property: "og:title", content: "IntentLock — Guarded Checkout" },
      {
        property: "og:description",
        content: "당신이 승인한 구매만 결제됩니다.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <GridBg />
        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-24 md:pt-32 md:pb-32">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            v1.11 · Guarded Checkout · 샌드박스
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-7xl">
            당신이 승인한 <span className="italic font-light text-muted-foreground">구매만</span>
            <br />결제됩니다.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            자연어 계약을 서버가 정규화하고 SHA-256 지문으로 봉인합니다. 지문·금액·목적이 하나라도
            다르면 결제 승인 API 이전 단계에서 차단됩니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/checkout"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              Beta Pass 구매 · ₩1,000
            </Link>
            <Link
              to="/beta"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              내 Beta Pass 보기
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
            {[
              ["1,000₩", "출시 검증 가격"],
              ["30일", "이용권 유효기간"],
              ["10건", "Guardian 리포트"],
              ["SHA-256", "계약 지문"],
            ].map(([n, l]) => (
              <div key={l} className="bg-background px-6 py-8">
                <div className="text-3xl font-semibold tracking-tight md:text-4xl">{n}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-foreground py-5 text-background overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap text-xs tracking-[0.3em] font-medium px-6">
          {[
            "AMOUNT VERIFIED",
            "INTENT SIGNED",
            "SERVER OF RECORD",
            "AUDIT APPEND-ONLY",
            "IDEMPOTENT CANCEL",
          ].map((t) => (
            <span key={t} className="flex items-center gap-12">
              {t}
              <span aria-hidden className="opacity-40">
                ◦
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">흐름</div>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            4단계의 서버 게이트.
          </h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
            {[
              ["01", "계약", "자연어를 서버가 정규화·지문화. 승인 시각과 30분 만료를 함께 저장합니다."],
              ["02", "Guardian", "승인된 최신 계약과 주문 금액·목적을 대조해 ALLOW/BLOCK 판정."],
              ["03", "결제", "샌드박스 결제 승인. 주문·계약·금액을 트랜잭션 안에서 다시 검증합니다."],
              ["04", "지급·감사", "Beta Pass 지급을 정확히 1회. 취소·환불 시 권한은 자동 회수됩니다."],
            ].map(([n, t, d]) => (
              <article key={n} className="bg-background p-8">
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>단계 {n}</span>
                  <span className="font-mono">/{n}</span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">{t}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-16 text-xs text-muted-foreground">
        <div className="flex flex-col gap-2 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <span>© 2026 IntentLock · Guarded Checkout · 샌드박스 데모</span>
          <span className="font-mono">v1.11 · F-10 진행 중</span>
        </div>
      </footer>
    </main>
  );
}

function GridBg() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage:
          "radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 100%)",
      }}
    />
  );
}