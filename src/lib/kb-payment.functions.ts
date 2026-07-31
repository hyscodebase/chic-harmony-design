import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type {
  VerifiedIntent,
  VirtualCardCredential,
  NetworkPaymentToken,
  PaymentAuthorization,
} from "./kb-payment.types";

const IntentBindingSchema = z.object({
  orderId: z.string().min(1).max(64),
  intentToken: z.string().min(4).max(128),
  userRef: z.string().min(1).max(128),
  merchant: z.string().min(1).max(200),
  productTitle: z.string().min(1).max(200),
  currency: z.literal("KRW"),
  amount: z.number().int().positive().max(1_000_000_000),
  expiresAt: z.string().min(4).max(64),
});
const IdemKey = z.string().min(8).max(128);

export const kbVerifyIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ intent: IntentBindingSchema, idempotencyKey: IdemKey }).parse(input),
  )
  .handler(async ({ data }): Promise<VerifiedIntent> => {
    const { getKbPaymentAdapter } = await import("./kb-payment.server");
    return getKbPaymentAdapter().verifyIntentToken(data);
  });

export const kbIssueVirtualCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ intent: IntentBindingSchema, idempotencyKey: IdemKey }).parse(input),
  )
  .handler(async ({ data }): Promise<VirtualCardCredential> => {
    const { getKbPaymentAdapter } = await import("./kb-payment.server");
    return getKbPaymentAdapter().issueVirtualCard(data);
  });

export const kbExchangeNetworkToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        intent: IntentBindingSchema,
        cardId: z.string().min(4).max(64),
        idempotencyKey: IdemKey,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<NetworkPaymentToken> => {
    const { getKbPaymentAdapter } = await import("./kb-payment.server");
    return getKbPaymentAdapter().exchangeNetworkToken(data);
  });

export const kbAuthorizePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        intent: IntentBindingSchema,
        cardId: z.string().min(4).max(64),
        networkToken: z.string().min(4).max(128),
        idempotencyKey: IdemKey,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PaymentAuthorization> => {
    const { getKbPaymentAdapter } = await import("./kb-payment.server");
    return getKbPaymentAdapter().authorizePayment(data);
  });

export const kbDestroyVirtualCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ cardId: z.string().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { getKbPaymentAdapter } = await import("./kb-payment.server");
    await getKbPaymentAdapter().destroyVirtualCard(data.cardId);
    return { ok: true as const };
  });
