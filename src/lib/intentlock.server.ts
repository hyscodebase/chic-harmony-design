// Server-only helpers for IntentLock. Never imported from client bundles.
import { createHash, randomUUID } from "crypto";
import { callAIJson } from "./ai-provider.server";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function newOrderNo(): string {
  return `INTENTLOCK-${randomUUID().toUpperCase()}`;
}

export interface NormalizedContract {
  purpose: string;
  amount_limit_krw: number;
  count: number;
  currency: "KRW";
  notes: string;
}

export interface GuardianJudgement {
  verdict: "ALLOW" | "BLOCK";
  reason: string;
  matched: {
    amount: boolean;
    purpose: boolean;
  };
}

export async function normalizeIntent(
  naturalLanguage: string,
  product: { name: string; purpose: string; amount_krw: number },
): Promise<NormalizedContract> {
  const system = `너는 IntentLock의 계약 정규화 엔진이다.
사용자의 한국어 자연어 구매 의도를 정확한 JSON 계약으로 정규화한다.
반드시 아래 JSON 스키마만 반환한다:
{
  "purpose": string,           // 구매 목적 한 문장
  "amount_limit_krw": number,  // 사용자가 명시했거나 상품가에서 유추한 최대 금액 (원, 정수)
  "count": number,             // 승인 횟수, 기본 1
  "currency": "KRW",
  "notes": string              // 부가 조건 요약 (없으면 빈 문자열)
}
상품 정보: 이름="${product.name}", 목적="${product.purpose}", 정가=${product.amount_krw}원.
사용자 문장에 금액이 없으면 amount_limit_krw 는 정가로 설정한다.
오직 JSON 오브젝트 하나만 반환하고 어떤 설명도 붙이지 않는다.`;
  const raw = await callAIJson([
    { role: "system", content: system },
    { role: "user", content: naturalLanguage },
  ]);
  const parsed = JSON.parse(raw) as Partial<NormalizedContract>;
  const amount = Math.round(Number(parsed.amount_limit_krw ?? product.amount_krw));
  return {
    purpose: String(parsed.purpose ?? product.purpose).slice(0, 200),
    amount_limit_krw: Number.isFinite(amount) && amount > 0 ? amount : product.amount_krw,
    count: Math.max(1, Math.min(10, Math.round(Number(parsed.count ?? 1)))),
    currency: "KRW",
    notes: String(parsed.notes ?? "").slice(0, 300),
  };
}

export function judgeContractPolicy(
  contract: NormalizedContract,
  product: { name: string; purpose: string; amount_krw: number },
): { verdict: "PASS" | "BLOCK"; reason: string } {
  if (contract.amount_limit_krw < product.amount_krw) {
    return {
      verdict: "BLOCK",
      reason: `계약 상한(${contract.amount_limit_krw.toLocaleString("ko-KR")}원)이 상품 정가(${product.amount_krw.toLocaleString("ko-KR")}원)보다 낮습니다.`,
    };
  }
  if (contract.amount_limit_krw > product.amount_krw * 3) {
    return {
      verdict: "BLOCK",
      reason: "AMOUNT_EXCEEDS_INTENT_LIMIT: 상품 정가의 3배를 초과할 수 없습니다.",
    };
  }
  if (contract.count !== 1) {
    return { verdict: "BLOCK", reason: "R1 Beta Pass 는 1회 구매만 지원합니다." };
  }
  return { verdict: "PASS", reason: "정책 판정 통과." };
}

export async function guardianJudge(
  scenario: string,
  contract: NormalizedContract,
): Promise<GuardianJudgement> {
  const system = `너는 IntentLock Guardian 이다.
구매자가 승인한 계약과, 새로 제안된 구매 시나리오를 비교해 결제 허용 여부를 판정한다.
계약:
- 목적: ${contract.purpose}
- 최대 금액: ${contract.amount_limit_krw}원
- 통화: KRW
- 승인 횟수: ${contract.count}
- 부가 조건: ${contract.notes || "(없음)"}

판정 규칙:
- 제안 금액이 최대 금액을 초과하면 반드시 BLOCK.
- 제안 목적이 계약 목적과 다르면 BLOCK.
- 그 외에는 ALLOW.

반드시 아래 JSON 만 반환:
{
  "verdict": "ALLOW"|"BLOCK",
  "reason": string,
  "matched": { "amount": boolean, "purpose": boolean }
}`;
  const raw = await callAIJson([
    { role: "system", content: system },
    { role: "user", content: scenario },
  ]);
  const parsed = JSON.parse(raw) as GuardianJudgement;
  return {
    verdict: parsed.verdict === "ALLOW" ? "ALLOW" : "BLOCK",
    reason: String(parsed.reason ?? "").slice(0, 300),
    matched: {
      amount: Boolean(parsed.matched?.amount),
      purpose: Boolean(parsed.matched?.purpose),
    },
  };
}
