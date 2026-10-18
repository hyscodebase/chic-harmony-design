import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { getBetaPassProduct, testInstantPurchase } from "@/lib/intentlock.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "구매 · IntentLock Beta Pass" },
      { name: "description", content: "Intent Contract 를 승인하고 Beta Pass 를 구매합니다." },
      { property: "og:title", content: "구매 · IntentLock Beta Pass" },
      { property: "og:description", content: "Intent Contract 를 승인하고 Beta Pass 를 구매합니다." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://intentlock.kro.kr/intentlock-share.jpg" },
      { name: "twitter:image", content: "https://intentlock.kro.kr/intentlock-share.jpg" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type Product = {
  id: string;
  name: string;
  description: string;
  amount_krw: number;
  purpose: string;
};

function CheckoutPage() {
  const navigate = useNavigate();
  const fetchProduct = useServerFn(getBetaPassProduct);
  const runInstant = useServerFn(testInstantPurchase);

  const [product, setProduct] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    fetchProduct()
      .then((p) => setProduct(p as Product))
      .catch((e) => setErr(String(e)));
  }, [fetchProduct]);

  async function handleInstantPurchase() {
    setBusy(true);
    setErr(null);
    try {
      await runInstant({ data: { idempotency_key: idempotencyKey } });
      navigate({ to: "/purchases" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
        불러오는 중…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        Beta Pass · 테스트 서버
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        {product.name} 구매
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{product.description}</p>

      {err && (
        <div className="mt-6 rounded-md border border-border bg-muted px-4 py-3 text-sm">
          <span className="font-medium">오류</span> · {err}
        </div>
      )}

      <div className="mt-10 rounded-lg border border-border bg-background p-8">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">상품</dt>
          <dd>{product.name}</dd>
          <dt className="text-muted-foreground">목적</dt>
          <dd>{product.purpose}</dd>
          <dt className="text-muted-foreground">정가</dt>
          <dd>
            <span className="line-through text-muted-foreground">
              ₩{product.amount_krw.toLocaleString("ko-KR")}
            </span>{" "}
            <span className="ml-2">₩0 (테스트 서버)</span>
          </dd>
        </dl>

        <button
          onClick={handleInstantPurchase}
          disabled={busy}
          className="mt-8 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "구매 처리 중…" : "현재 0원 (테스트 서버) — 구매하기"}
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          테스트 단계입니다. 버튼을 누르면 결제 없이 즉시 이용권이 지급됩니다.
        </p>
      </div>
    </main>
  );
}
