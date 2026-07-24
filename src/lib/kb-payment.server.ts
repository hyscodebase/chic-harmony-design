// Server-only KB payment adapter. Never import from client bundles.
import type {
  KbPaymentAdapter,
  VerifyIntentInput,
  VerifiedIntent,
  IssueVirtualCardInput,
  VirtualCardCredential,
  ExchangeNetworkTokenInput,
  NetworkPaymentToken,
  AuthorizePaymentInput,
  PaymentAuthorization,
} from "./kb-payment.types";

// ---- In-memory demo state (per Worker isolate) ----
type IntentRecord = {
  intentToken: string;
  orderId: string;
  userRef: string;
  merchant: string;
  productTitle: string;
  amount: number;
  currency: "KRW";
  expiresAt: number;
  status: "ISSUED" | "VERIFIED" | "EXCHANGED" | "AUTHORIZED" | "CONSUMED";
};
type CardRecord = VirtualCardCredential & { orderId: string; boundNetworkToken?: string };
type AuthRecord = PaymentAuthorization & { orderId: string };

type Store = {
  intents: Map<string, IntentRecord>; // by intentToken
  cards: Map<string, CardRecord>;     // by cardId
  authByOrder: Map<string, AuthRecord>; // idempotency by orderId
  idem: Map<string, unknown>;         // idempotencyKey -> response
};

const g = globalThis as unknown as { __kbPaymentStore?: Store };
const store: Store = (g.__kbPaymentStore ??= {
  intents: new Map(),
  cards: new Map(),
  authByOrder: new Map(),
  idem: new Map(),
});

function rand(bytes: number) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function idem<T>(key: string, produce: () => T): T {
  const hit = store.idem.get(key);
  if (hit !== undefined) return hit as T;
  const value = produce();
  store.idem.set(key, value);
  return value;
}

function ensureIntent(intentToken: string): IntentRecord {
  const r = store.intents.get(intentToken);
  if (!r) throw new Error("Intent Token 을 찾을 수 없습니다.");
  if (r.expiresAt < Date.now()) throw new Error("Intent Token 이 만료되었습니다.");
  if (r.status === "CONSUMED") throw new Error("이미 사용된 Intent Token 입니다.");
  return r;
}

// Public helper: register an intent that section-4 already produced client-side.
// Called once from the KB section entry so verify/issue can operate against real state.
export function registerIntent(input: {
  intentToken: string;
  orderId: string;
  userRef: string;
  merchant: string;
  productTitle: string;
  amount: number;
}): IntentRecord {
  const existing = store.intents.get(input.intentToken);
  if (existing) return existing;
  const rec: IntentRecord = {
    intentToken: input.intentToken,
    orderId: input.orderId,
    userRef: input.userRef,
    merchant: input.merchant,
    productTitle: input.productTitle,
    amount: input.amount,
    currency: "KRW",
    expiresAt: Date.now() + 5 * 60 * 1000,
    status: "ISSUED",
  };
  store.intents.set(input.intentToken, rec);
  return rec;
}

// ---- MockKbPaymentAdapter ----
export class MockKbPaymentAdapter implements KbPaymentAdapter {
  async verifyIntentToken(input: VerifyIntentInput): Promise<VerifiedIntent> {
    return idem(input.idempotencyKey, () => {
      // Ensure the intent is registered; if not, register from binding.
      if (!store.intents.has(input.intent.intentToken)) {
        registerIntent({
          intentToken: input.intent.intentToken,
          orderId: input.intent.orderId,
          userRef: input.intent.userRef,
          merchant: input.intent.merchant,
          productTitle: input.intent.productTitle,
          amount: input.intent.amount,
        });
      }
      const r = ensureIntent(input.intent.intentToken);
      if (r.orderId !== input.intent.orderId) throw new Error("주문 정보가 일치하지 않습니다.");
      if (r.merchant !== input.intent.merchant) throw new Error("판매자가 일치하지 않습니다.");
      if (r.productTitle !== input.intent.productTitle) throw new Error("상품이 일치하지 않습니다.");
      if (r.amount !== input.intent.amount) throw new Error("금액이 일치하지 않습니다.");
      r.status = "VERIFIED";
      return { intentToken: r.intentToken, status: "VERIFIED", verifiedAt: new Date().toISOString() };
    });
  }

  async issueVirtualCard(input: IssueVirtualCardInput): Promise<VirtualCardCredential> {
    return idem(input.idempotencyKey, () => {
      const r = ensureIntent(input.intent.intentToken);
      const cardId = `KBIC-${rand(6)}`;
      const card: CardRecord = {
        cardId,
        displayName: "KB Intent Card",
        maskedNumber: "5410 90•• •••• 4821",
        limitKrw: r.amount,
        allowedMerchants: r.merchant.split(" · "),
        usesAllowed: 1,
        expiresAt: new Date(r.expiresAt).toISOString(),
        linkedFundingSource: "KB국민카드 •••• 5678",
        status: "ACTIVE",
        orderId: r.orderId,
      };
      store.cards.set(cardId, card);
      return card;
    });
  }

  async exchangeNetworkToken(input: ExchangeNetworkTokenInput): Promise<NetworkPaymentToken> {
    return idem(input.idempotencyKey, () => {
      const r = ensureIntent(input.intent.intentToken);
      const card = store.cards.get(input.cardId);
      if (!card || card.status !== "ACTIVE") throw new Error("가상카드가 유효하지 않습니다.");
      const networkToken = `NPT-KB-${rand(6)}`;
      card.boundNetworkToken = networkToken;
      r.status = "EXCHANGED";
      return { networkToken, network: "KB", status: "TOKENIZED", issuedAt: new Date().toISOString() };
    });
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<PaymentAuthorization> {
    // Idempotent by orderId to prevent double charge on retry/refresh.
    const prior = store.authByOrder.get(input.intent.orderId);
    if (prior) return prior;
    return idem(input.idempotencyKey, () => {
      const r = ensureIntent(input.intent.intentToken);
      const card = store.cards.get(input.cardId);
      if (!card || card.status !== "ACTIVE") throw new Error("가상카드가 유효하지 않습니다.");
      if (card.boundNetworkToken !== input.networkToken) throw new Error("Network Token 이 일치하지 않습니다.");
      if (r.amount !== input.intent.amount) throw new Error("금액이 변경되었습니다. 결제를 중단합니다.");
      if (r.merchant !== input.intent.merchant) throw new Error("판매자가 변경되었습니다. 결제를 중단합니다.");
      // Authorize + consume
      r.status = "CONSUMED";
      card.status = "DESTROYED";
      const last4 = input.networkToken.slice(-4);
      const auth: AuthRecord = {
        status: "AUTHORIZED",
        approvalNo: `KB-APR-${rand(4)}`,
        authorizedAt: new Date().toISOString(),
        amount: r.amount,
        merchant: r.merchant,
        productTitle: r.productTitle,
        method: card.displayName,
        networkTokenLast4: last4,
        intentTokenStatus: "CONSUMED",
        virtualCardStatus: "DESTROYED",
        orderId: r.orderId,
      };
      store.authByOrder.set(r.orderId, auth);
      return auth;
    });
  }

  async destroyVirtualCard(cardId: string): Promise<void> {
    const card = store.cards.get(cardId);
    if (!card) return;
    card.status = "DESTROYED";
  }
}

export function getKbPaymentAdapter(): KbPaymentAdapter {
  const mode = process.env.KB_PAYMENT_MODE ?? "mock";
  // Only "mock" is implemented; replace with a real adapter when KB APIs are available.
  if (mode !== "mock") {
    console.warn(`[kb-payment] KB_PAYMENT_MODE=${mode} not implemented; falling back to mock.`);
  }
  return new MockKbPaymentAdapter();
}