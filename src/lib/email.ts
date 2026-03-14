import "server-only";

import { formatFullDate, getRoleLabel } from "@/lib/utils";
import type { BoardRole } from "@/types";

const RESEND_API_URL = "https://api.resend.com/emails";

type SendBoardInvitationEmailInput = {
  boardName: string;
  invitedByName: string;
  inviteUrl: string;
  expiresAt: Date;
  role: BoardRole;
  to: string;
};

type EmailDeliveryResult =
  | {
      sent: true;
    }
  | {
      sent: false;
      reason: string;
    };

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

  if (!appUrl) {
    return null;
  }

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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      reason:
        "La invitación quedó creada, pero falta configurar RESEND_API_KEY y EMAIL_FROM para enviar el correo.",
    };
  }

  let response: Response;

  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `${input.invitedByName} te invitó a ${input.boardName} en ProjectFlow`,
        html: buildInvitationHtml(input),
        text: buildInvitationText(input),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos contactar al proveedor.";

    return {
      sent: false,
      reason: `La invitación quedó creada, pero falló el envío del correo. ${message}`,
    };
  }

  if (!response.ok) {
    const body = await response.text();

    return {
      sent: false,
      reason: `La invitación quedó creada, pero el proveedor de email devolvió ${response.status}. ${body.slice(0, 180)}`,
    };
  }

  return {
    sent: true,
  };
}
