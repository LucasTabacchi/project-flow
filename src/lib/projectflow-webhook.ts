import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

import { WEBHOOK_EVENTS } from "@/lib/webhook-events";

export const PROJECTFLOW_WEBHOOK_RECEIVER_EVENTS = [
  ...WEBHOOK_EVENTS,
  "webhook.test",
] as const;

export const projectFlowWebhookPayloadSchema = z.object({
  event: z.enum(PROJECTFLOW_WEBHOOK_RECEIVER_EVENTS),
  boardId: z.string().trim().min(1),
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.unknown()),
});

export type ProjectFlowWebhookPayload = z.infer<typeof projectFlowWebhookPayloadSchema>;

export function verifyProjectFlowWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function isProjectFlowWebhookFresh(timestamp: string, toleranceMs: number) {
  const parsed = Date.parse(timestamp);

  if (Number.isNaN(parsed)) {
    return false;
  }

  return Math.abs(Date.now() - parsed) <= toleranceMs;
}
