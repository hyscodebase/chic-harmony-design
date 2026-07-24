import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntentLock — Guarded Checkout for AI Purchases" },
      {
        name: "description",
        content:
          "IntentLock verifies every AI-driven purchase against the intent you signed. Server-side policy, audit-grade evidence, monochrome by design.",
      },
      { property: "og:title", content: "IntentLock — Guarded Checkout" },
      {
        property: "og:description",
        content:
          "Only orders that match the intent you approved are allowed to charge. Everything else is stopped at the server.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Nav />
      <Hero />
      <Marquee />
      <Contract />
      <Flow />
      <Numbers />
      <FAQ />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center bg-foreground text-background text-[10px] font-bold">
            IL
          </span>
          <span className="text-sm font-semibold tracking-tight">IntentLock</span>
        </a>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#contract" className="hover:text-foreground transition-colors">Contract</a>
          <a href="#flow" className="hover:text-foreground transition-colors">Flow</a>
          <a href="#numbers" className="hover:text-foreground transition-colors">Evidence</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <a
          href="#contract"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 transition-opacity"
        >
          Get Beta Pass
          <span aria-hidden>→</span>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <GridBg />
      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-28 md:pt-32 md:pb-36">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
          v1.11 · Guarded Checkout
        </div>
        <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-7xl lg:text-8xl">
          Only the purchase{" "}
          <span className="italic font-light text-muted-foreground">you</span> approved.
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          IntentLock signs a natural-language contract with the buyer,
          then compares every order against it on the server. Anything
          off-intent never reaches the card.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="#contract"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90 transition-opacity"
          >
            Buy Beta Pass · ₩1,000
          </a>
          <a
            href="#flow"
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
          >
            See how it works
          </a>
        </div>

        <div className="mt-24 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {[
            ["16", "D1 tables"],
            ["95", "tests green"],
            ["0", "prod vulns"],
            ["10", "Guardian reports"],
          ].map(([n, l]) => (
            <div key={l} className="bg-background px-6 py-8">
              <div className="text-3xl font-semibold tracking-tight md:text-4xl">{n}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
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

function Marquee() {
  const items = [
    "AMOUNT VERIFIED",
    "INTENT SIGNED",
    "SERVER OF RECORD",
    "AUDIT APPEND-ONLY",
    "IDEMPOTENT CANCEL",
    "SHA-256 FINGERPRINT",
  ];
  return (
    <div className="border-b border-border bg-foreground py-5 text-background overflow-hidden">
      <div className="flex gap-12 whitespace-nowrap text-xs tracking-[0.3em] font-medium">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-12">
            {t}
            <span aria-hidden className="opacity-40">◦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Contract() {
  return (
    <section id="contract" className="border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-16 px-6 py-24 md:grid-cols-2 md:py-32">
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">01 · Intent Contract</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              A signed sentence,<br />not a checkbox.
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              The buyer approves plain language: purpose, amount,
              frequency, delivery. The server normalises it, fingerprints
              it, and refuses to charge anything else.
            </p>
          </div>
          <ul className="mt-10 space-y-3 text-sm">
            {[
              "Server-side policy judgement",
              "SHA-256 contract fingerprint",
              "CONSUMED transition on approval",
              "Append-only audit trail",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 border-t border-border pt-3">
                <span className="text-muted-foreground">—</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="rounded-lg border border-border bg-card p-6 shadow-[0_1px_0_0_var(--border)]">
            <div className="flex items-center justify-between border-b border-border pb-3 text-xs text-muted-foreground">
              <span className="font-mono">contract.v1.json</span>
              <span>PENDING → APPROVED</span>
            </div>
            <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
{`{
  "product":  "IntentLock Beta Pass",
  "purpose":  "30일 Guardian 리포트 이용권",
  "amount":   { "value": 1000, "currency": "KRW" },
  "count":    1,
  "expires":  "2026-08-23T00:00:00Z",
  "owner":    "usr_2f…c81",
  "fingerprint":
    "9c4e…ab27 (sha-256)"
}`}
            </pre>
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-foreground" />
                <span>Signed by buyer · 24 Jul 2026</span>
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest">
                v1.11
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-4 -z-10 rounded-2xl bg-foreground/[0.03] blur-2xl" />
        </div>
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    { n: "02", t: "Approve", d: "Buyer confirms the natural-language contract. The server timestamps and fingerprints it." },
    { n: "03", t: "Authorise", d: "Toss redirect returns. Server re-verifies owner, amount, currency, contract before approval." },
    { n: "04", t: "Grant", d: "Payment approved event grants the digital entitlement exactly once. Idempotent by order id." },
    { n: "05", t: "Reconcile", d: "Webhooks and PG source of truth reconcile async. Full-amount cancel with fixed idempotency key." },
  ];
  return (
    <section id="flow" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mb-16 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">The flow</div>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
              Four gates between intent and money.
            </h2>
          </div>
          <div className="hidden text-right text-xs text-muted-foreground md:block">
            End-to-end · R1 · Beta Pass
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
          {steps.map((s) => (
            <article key={s.n} className="bg-background p-8 md:p-10">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">Step {s.n}</span>
                <span className="font-mono text-muted-foreground">/{s.n}</span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">{s.t}</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Numbers() {
  return (
    <section id="numbers" className="border-b border-border bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-16 md:grid-cols-[1.2fr_1fr] md:items-end">
          <h2 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">
            Evidence over<br />
            <span className="italic font-light opacity-70">assumption.</span>
          </h2>
          <p className="text-sm leading-relaxed text-background/70">
            Every order, contract, webhook and cancellation is written
            append-only with an idempotency key, a handler identity, and
            a de-identified PG snapshot. The operator can replay the
            evidence without ever trusting the client.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 border-t border-background/20 pt-12 md:grid-cols-4">
          {[
            ["1,000₩", "Beta Pass price"],
            ["30d", "Access window"],
            ["7d", "Refund draft"],
            ["18", "Release gates"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-4xl font-semibold tracking-tight md:text-5xl">{n}</div>
              <div className="mt-2 text-xs uppercase tracking-widest text-background/60">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    ["What is Guarded Checkout?", "The server compares every order to a signed intent contract before authorising the card. Off-intent orders never reach the PG."],
    ["Is this a general shopping agent?", "No. R1 sells one product — IntentLock Beta Pass — end-to-end. R3 opens Guardian API for merchants once R1 is validated."],
    ["What do I get for ₩1,000?", "30 days of Guardian judgement reports, up to 10, generated and stored against your account the moment payment is approved."],
    ["How does refund work?", "Full refund within 7 days of purchase, with the granted entitlement revoked. Statutory withdrawal periods take precedence when longer."],
  ];
  return (
    <section id="faq" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">FAQ</div>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Questions the audit log answers.
        </h2>
        <div className="mt-14 divide-y divide-border border-y border-border">
          {qs.map(([q, a]) => (
            <details key={q} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-8">
                <span className="text-lg font-medium tracking-tight md:text-xl">{q}</span>
                <span
                  aria-hidden
                  className="grid h-8 w-8 flex-none place-items-center rounded-full border border-border text-sm transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center bg-foreground text-background text-[10px] font-bold">
              IL
            </span>
            <span className="text-sm font-semibold tracking-tight">IntentLock</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Guarded Checkout for AI-driven purchases. Sandbox v1.11.
            Live launch behind the F-10 release gate.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Product</div>
            <ul className="mt-3 space-y-2">
              <li><a href="#contract" className="hover:underline">Contract</a></li>
              <li><a href="#flow" className="hover:underline">Flow</a></li>
              <li><a href="#numbers" className="hover:underline">Evidence</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Legal</div>
            <ul className="mt-3 space-y-2">
              <li>Terms</li>
              <li>Privacy</li>
              <li>Refund</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Status</div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>F-10 in progress</li>
              <li>95 tests · 0 vulns</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-14 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>© 2026 IntentLock. All observations recorded.</span>
        <span className="font-mono">v1.11 · fingerprint 9c4e…ab27</span>
      </div>
    </footer>
  );
}
