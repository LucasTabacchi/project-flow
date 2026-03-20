import "server-only";

import { logError, logWarn } from "@/lib/observability";
import { formatFullDate, getRoleLabel } from "@/lib/utils";
import type { BoardRole } from "@/types";

// Brevo (ex Sendinblue) — permite enviar desde un Gmail verificado
// sin necesitar un dominio propio. Plan gratuito: 300 emails/día.
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

type SendBoardInvitationEmailInput = {
  boardName: string;
  invitedByName: string;
  inviteUrl: string;
  expiresAt: Date;
  role: BoardRole;
  to: string;
};

type EmailDeliveryResult =
  | { sent: true }
  | { sent: false; reason: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAppUrl() {
  const directUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (directUrl) {
    return directUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return null;
}

export function buildInvitationUrl(token: string) {
  const appUrl = getAppUrl();
  if (!appUrl) return null;
  return new URL(`/invite/${token}`, `${appUrl}/`).toString();
}

function buildInvitationText({
  boardName,
  invitedByName,
  inviteUrl,
  expiresAt,
  role,
}: SendBoardInvitationEmailInput) {
  return [
    `${invitedByName} te invitó al tablero "${boardName}" en ProjectFlow.`,
    `Rol inicial: ${getRoleLabel(role)}.`,
    `La invitación vence el ${formatFullDate(expiresAt)}.`,
    "",
    `Abrí este enlace para aceptarla: ${inviteUrl}`,
  ].join("\n");
}

function buildInvitationHtml({
  boardName,
  invitedByName,
  inviteUrl,
  expiresAt,
  role,
}: SendBoardInvitationEmailInput) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
      <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;margin:0 0 12px;">
        ProjectFlow
      </p>
      <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;">
        ${escapeHtml(invitedByName)} te invitó a colaborar.
      </h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#334155;">
        Fuiste invitado al tablero <strong>${escapeHtml(boardName)}</strong> con el rol inicial de
        <strong> ${escapeHtml(getRoleLabel(role))}</strong>.
      </p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#334155;">
        La invitación vence el ${escapeHtml(formatFullDate(expiresAt))}.
      </p>
      <a
        href="${escapeHtml(inviteUrl)}"
        style="display:inline-block;border-radius:16px;background:#0f766e;color:#ffffff;padding:14px 20px;text-decoration:none;font-weight:700;"
      >
        Abrir invitación
      </a>
      <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#64748b;">
        Si el botón no funciona, copiá este enlace en tu navegador:<br />
        <a href="${escapeHtml(inviteUrl)}" style="color:#0f766e;">${escapeHtml(inviteUrl)}</a>
      </p>
    </div>
  `.trim();
}

export async function sendBoardInvitationEmail(
  input: SendBoardInvitationEmailInput,
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS;
  const fromName = process.env.EMAIL_FROM_NAME ?? "ProjectFlow";

  if (!apiKey || !fromEmail) {
    logWarn("email.invitation.skipped_missing_config", {
      hasApiKey: Boolean(apiKey),
      hasFromEmail: Boolean(fromEmail),
      to: input.to,
      boardName: input.boardName,
    });

    return {
      sent: false,
      reason:
        "La invitación quedó creada, pero falta configurar BREVO_API_KEY y EMAIL_FROM_ADDRESS para enviar el correo.",
    };
  }

  let response: Response;

  try {
    response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: input.to }],
        subject: `${input.invitedByName} te invitó a ${input.boardName} en ProjectFlow`,
        htmlContent: buildInvitationHtml(input),
        textContent: buildInvitationText(input),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos contactar al proveedor.";

    logError("email.invitation.request_failed", {
      to: input.to,
      boardName: input.boardName,
      error,
    });

    return {
      sent: false,
      reason: `La invitación quedó creada, pero falló el envío del correo. ${message}`,
    };
  }

  if (!response.ok) {
    const body = await response.text();

    logWarn("email.invitation.provider_rejected", {
      to: input.to,
      boardName: input.boardName,
      status: response.status,
      body: body.slice(0, 500),
    });

    return {
      sent: false,
      reason: `La invitación quedó creada, pero el proveedor de email devolvió ${response.status}. ${body.slice(0, 180)}`,
    };
  }

  return { sent: true };
}
