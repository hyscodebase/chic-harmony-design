import { createFileRoute, Link } from "@tanstack/react-router";
import flowDiagram from "@/assets/intentlock-flow-independent.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntentLock — 승인한 구매만 결제되는 Guarded Checkout" },
      {
        name: "description",
        content:
          "IntentLock 은 자연어로 승인한 계약과 주문 원본을 서버에서 대조해, 계약을 벗어난 결제를 원천 차단합니다.",
      },
      { property: "og:title", content: "IntentLock — 승인한 구매만 결제되는 Guarded Checkout" },
      {
        property: "og:description",
        content:
          "IntentLock 은 자연어로 승인한 계약과 주문 원본을 서버에서 대조해, 계약을 벗어난 결제를 원천 차단합니다.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://intentlock.kro.kr/intentlock-share.jpg" },
      { name: "twitter:image", content: "https://intentlock.kro.kr/intentlock-share.jpg" },
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
            Submission Build · Guarded Checkout · 샌드박스
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-7xl">
            당신이 승인한 <span className="italic font-light text-muted-foreground">구매만</span>
            <br />
            결제됩니다.
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
              데모 구매 시작
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
              ["₩1,000", "상품 기준가"],
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
            "INTENT FINGERPRINTED",
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
              [
                "01",
                "계약",
                "자연어를 서버가 정규화·지문화. 승인 시각과 30분 만료를 함께 저장합니다.",
              ],
              ["02", "Guardian", "승인된 최신 계약과 주문 금액·목적을 대조해 ALLOW/BLOCK 판정."],
              [
                "03",
                "결제",
                "샌드박스 결제 승인 직전에 주문·계약·금액을 서버에서 다시 검증합니다.",
              ],
              [
                "04",
                "지급·감사",
                "Beta Pass 지급을 정확히 1회. 취소·환불 시 권한은 자동 회수됩니다.",
              ],
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

      <HowItWorks />

      <footer className="mx-auto max-w-6xl px-6 py-16 text-xs text-muted-foreground">
        <div className="flex flex-col gap-2 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <span>© 2026 IntentLock · Guarded Checkout · 샌드박스 데모</span>
          <span className="font-mono">v1.0 · Competition Submission</span>
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
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 100%)",
      }}
    />
  );
}

function HowItWorks() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          어떻게 작동하는가
        </div>
        <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          AI를 통제하지 않습니다.
          <br />
          <span className="italic font-light text-muted-foreground">결제 승인 게이트웨이</span>를
          통제합니다.
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
          AI 에이전트는 쇼핑 담당자, IntentLock 은 결제 승인 담당자입니다. AI 가 물건을
          골라도 IntentLock 이 승인하지 않으면 돈은 빠져나가지 않습니다.
        </p>

        <figure className="mt-14 overflow-hidden rounded-lg border border-border bg-background">
          <img
            src={flowDiagram}
            alt="IntentLock 결제 승인 게이트웨이 시퀀스 다이어그램"
            className="w-full"
            loading="lazy"
          />
          <figcaption className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
            사용자 · 구매 Agent · IntentLock · 결제 시스템 · 판매자
          </figcaption>
        </figure>

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
          {[
            [
              "자연어 → 결제 규칙",
              "“5만 원 이하 꽃, 정기구독 금지” 를 서버가 Intent Contract JSON 으로 정규화하고 SHA-256 지문으로 변경 여부를 검증합니다.",
            ],
            [
              "AI 에는 카드번호 없음",
              "Agent 는 intent_id 와 승인 요청 권한만 갖습니다. 이 샌드박스는 실제 카드·계좌 정보를 저장하거나 처리하지 않습니다.",
            ],
            [
              "코드 규칙 + 의미 검증",
              "금액·판매자·필수 키워드는 코드로, 목적 일치 여부는 Guardian AI 가 보조 심사합니다.",
            ],
            [
              "일회용 결제 토큰",
              "판매자·금액·1회·5분 만료 로 제한된 토큰만 발급. 판매자가 1원이라도 더 청구하면 결제 시스템이 거절합니다.",
            ],
            [
              "프롬프트 인젝션 격리",
              "최종 결제 허용은 상품 설명의 지시문이 아니라 서버에 저장된 계약과 구조화된 결제 필드로 판정합니다.",
            ],
            [
              "3-Way 데이터 대조",
              "Agent 신고 · 판매자 주문서 · 결제 청구액 세 가지가 일치할 때만 승인. 하나라도 다르면 즉시 차단·감사 기록.",
            ],
          ].map(([t, d]) => (
            <article key={t} className="bg-background p-8">
              <h3 className="text-xl font-semibold tracking-tight">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <pre className="overflow-x-auto rounded-lg border border-border bg-background p-6 text-xs leading-relaxed">
            {`// 사용자가 승인한 Intent Contract
{
  "purpose": "어머니 생신 선물",
  "category": "flower",
  "max_amount": 50000,
  "quantity": 1,
  "delivery_deadline": "2026-07-25",
  "subscription_allowed": false,
  "max_transactions": 1,
  "expires_at": "2026-07-25T23:59:59+09:00"
}

INTENT_ID:  IL-20260724-001
FINGERPRINT: 8f5a1c...
STATUS:     ACTIVE`}
          </pre>
          <pre className="overflow-x-auto rounded-lg border border-border bg-background p-6 text-xs leading-relaxed">
            {`// Agent 가 요청한 결제 (조건 불일치)
{
  "merchant": "HappyFlower",
  "base_price": 48000,
  "additional_items": [
    { "name": "VIP 정기구독", "price": 29900 }
  ],
  "total_amount": 77900,
  "subscription": true
}

RESULT:  BLOCKED
REASON:  예산 초과 · 정기결제 미승인
         · 추가 상품 미승인`}
          </pre>
        </div>

        <div className="mt-16 rounded-lg border border-border bg-foreground p-8 text-background md:p-10">
          <div className="text-xs uppercase tracking-widest opacity-60">한 문장 정리</div>
          <p className="mt-4 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            AI 의 판단을 막지 않습니다. AI 가 돈을 쓰기 직전, 사용자가 승인한 원래 의도와 실제 결제
            요청을 대조해 <span className="italic font-light opacity-80">일치할 때만</span> 제한된
            일회용 결제 권한을 발급합니다.
          </p>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed opacity-70">
            IntentLock 은 세상의 모든 AI 결제를 감시하지 않습니다. IntentLock 결제 API 또는 전용
            가상카드를 사용하도록 설계된 AI Agent 의 결제만 통제합니다 — “AI Agent 전용 결제 인프라”
            입니다.
          </p>
        </div>
      </div>
    </section>
  );
}
