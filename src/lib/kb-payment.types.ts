// Shared, client-safe types for the KB payment adapter.

export type KbPaymentStatus =
  | "IDLE"
  | "VERIFYING_INTENT"
  | "ISSUING_VIRTUAL_CARD"
  | "EXCHANGING_NETWORK_TOKEN"
  | "AUTHORIZING_PAYMENT"
  | "AUTHORIZED"
  | "BLOCKED"
  | "FAILED";

export type IntentTokenStatus = "ISSUED" | "VERIFIED" | "EXCHANGED" | "AUTHORIZED" | "CONSUMED";

export type VirtualCardStatus = "PENDING" | "ACTIVE" | "USED" | "DESTROYED";

export interface IntentBinding {
  orderId: string;
  intentToken: string;
  userRef: string;
  merchant: string;
  productTitle: string;
  currency: "KRW";
  amount: number;
  expiresAt: string; // ISO
}

export interface VerifyIntentInput {
  intent: IntentBinding;
  idempotencyKey: string;
}

export interface VerifiedIntent {
  intentToken: string;
  status: "VERIFIED";
  verifiedAt: string;
}

export interface IssueVirtualCardInput {
  intent: IntentBinding;
  idempotencyKey: string;
}

export interface VirtualCardCredential {
  cardId: string;
  displayName: string; // "KB Intent Card"
  maskedNumber: string; // "5410 90•• •••• 4821"
  limitKrw: number;
  allowedMerchants: string[];
  usesAllowed: number;
  expiresAt: string; // ISO, ~5m
  linkedFundingSource: string; // "KB국민카드 •••• 5678"
  status: VirtualCardStatus;
}

export interface ExchangeNetworkTokenInput {
  intent: IntentBinding;
  cardId: string;
  idempotencyKey: string;
}

export interface NetworkPaymentToken {
  networkToken: string; // e.g. NPT-KB-7F29A8C1E45D (redacted client-side)
  network: "KB";
  status: "TOKENIZED";
  issuedAt: string;
}

export interface AuthorizePaymentInput {
  intent: IntentBinding;
  cardId: string;
  networkToken: string;
  idempotencyKey: string;
}

export interface PaymentAuthorization {
  status: "AUTHORIZED";
  approvalNo: string;
  authorizedAt: string;
  amount: number;
  merchant: string;
  productTitle: string;
  method: string; // masked, e.g. "KB Intent Card"
  networkTokenLast4: string;
  intentTokenStatus: "CONSUMED";
  virtualCardStatus: "DESTROYED";
}

export interface KbPaymentAdapter {
  verifyIntentToken(input: VerifyIntentInput): Promise<VerifiedIntent>;
  issueVirtualCard(input: IssueVirtualCardInput): Promise<VirtualCardCredential>;
  exchangeNetworkToken(input: ExchangeNetworkTokenInput): Promise<NetworkPaymentToken>;
  authorizePayment(input: AuthorizePaymentInput): Promise<PaymentAuthorization>;
  destroyVirtualCard(cardId: string): Promise<void>;
}
