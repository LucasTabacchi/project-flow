import "server-only";

import type { BoardEventPayload, BoardEvent } from "@/lib/board-events";
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

type SendEmailInput = {
  to: string[];
  subject: string;
  htmlContent: string;
  textContent: string;
  logContext: Record<string, unknown>;
  missingConfigReason: string;
  missingConfigEvent: string;
  requestFailedEvent: string;
  providerRejectedEvent: string;
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

function buildBoardUrl(boardId: string) {
  const appUrl = getAppUrl();
  if (!appUrl) return null;
  return new URL(`/boards/${boardId}`, `${appUrl}/`).toString();
}

function getEmailSenderConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS;
  const fromName = process.env.EMAIL_FROM_NAME ?? "ProjectFlow";

  return {
    apiKey,
    fromEmail,
    fromName,
  };
}

async function sendEmail(input: SendEmailInput): Promise<EmailDeliveryResult> {
  const { apiKey, fromEmail, fromName } = getEmailSenderConfig();

  if (!apiKey || !fromEmail) {
    logWarn(input.missingConfigEvent, {
      hasApiKey: Boolean(apiKey),
      hasFromEmail: Boolean(fromEmail),
      to: input.to,
      ...input.logContext,
    });

    return {
      sent: false,
      reason: input.missingConfigReason,
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
        to: input.to.map((email) => ({ email })),
        subject: input.subject,
        htmlContent: input.htmlContent,
        textContent: input.textContent,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos contactar al proveedor.";

    logError(input.requestFailedEvent, {
      to: input.to,
      ...input.logContext,
      error,
    });

    return {
      sent: false,
      reason: `${input.missingConfigReason.split(".")[0]}. Falló el envío del correo. ${message}`,
    };
  }

  if (!response.ok) {
    const body = await response.text();

    logWarn(input.providerRejectedEvent, {
      to: input.to,
      ...input.logContext,
      status: response.status,
      body: body.slice(0, 500),
    });

    return {
      sent: false,
      reason: `${input.missingConfigReason.split(".")[0]}. El proveedor de email devolvió ${response.status}. ${body.slice(0, 180)}`,
    };
  }

  return { sent: true };
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
  return sendEmail({
    to: [input.to],
    subject: `${input.invitedByName} te invitó a ${input.boardName} en ProjectFlow`,
    htmlContent: buildInvitationHtml(input),
    textContent: buildInvitationText(input),
    logContext: {
      boardName: input.boardName,
    },
    missingConfigReason:
      "La invitación quedó creada, pero falta configurar BREVO_API_KEY y EMAIL_FROM_ADDRESS para enviar el correo.",
    missingConfigEvent: "email.invitation.skipped_missing_config",
    requestFailedEvent: "email.invitation.request_failed",
    providerRejectedEvent: "email.invitation.provider_rejected",
  });
}

const BOARD_EVENT_LABELS: Record<BoardEvent, string> = {
  "card.created": "Tarjeta creada",
  "card.moved": "Tarjeta movida",
  "card.status_changed": "Estado de tarjeta cambiado",
  "card.assigned": "Responsables asignados",
  "comment.added": "Comentario agregado",
  "list.created": "Lista creada",
  "member.joined": "Miembro unido",
};

function buildBoardEventSummary(payload: BoardEventPayload<BoardEvent>) {
  switch (payload.event) {
    case "card.created":
      return {
        title: `Se creó la tarjeta "${String(payload.data.cardTitle ?? "Sin título")}"`,
        lines: [
          `Lista: ${String(payload.data.listName ?? "Sin lista")}`,
          `Creada por: ${String(payload.data.createdBy ?? "Desconocido")}`,
        ],
      };
    case "card.moved":
      return {
        title: `Se movió la tarjeta "${String(payload.data.cardTitle ?? "Sin título")}"`,
        lines: [
          `De: ${String(payload.data.fromList ?? "Sin origen")}`,
          `A: ${String(payload.data.toList ?? "Sin destino")}`,
          `Movida por: ${String(payload.data.movedBy ?? "Desconocido")}`,
        ],
      };
    case "card.status_changed":
      return {
        title: `Cambió el estado de "${String(payload.data.cardTitle ?? "Sin título")}"`,
        lines: [
          `Antes: ${String(payload.data.oldStatus ?? "Sin valor")}`,
          `Ahora: ${String(payload.data.newStatus ?? "Sin valor")}`,
          `Actualizado por: ${String(payload.data.updatedBy ?? "Desconocido")}`,
        ],
      };
    case "card.assigned":
      return {
        title: `Se asignaron responsables a "${String(payload.data.cardTitle ?? "Sin título")}"`,
        lines: [
          `Asignado por: ${String(payload.data.assignedBy ?? "Desconocido")}`,
          `Responsables: ${Array.isArray(payload.data.assignees)
            ? payload.data.assignees
                .map((entry) =>
                  typeof entry === "object" && entry && "name" in entry
                    ? String(entry.name)
                    : "Sin nombre",
                )
                .join(", ")
            : "Sin responsables"}`,
        ],
      };
    case "comment.added":
      return {
        title: `Nuevo comentario en "${String(payload.data.cardTitle ?? "Sin título")}"`,
        lines: [
          `Comentó: ${String(payload.data.commentedBy ?? "Desconocido")}`,
          `Comentario: ${String(payload.data.commentBody ?? "Sin contenido")}`,
        ],
      };
    case "list.created":
      return {
        title: `Se creó la lista "${String(payload.data.listName ?? "Sin nombre")}"`,
        lines: [`Creada por: ${String(payload.data.createdBy ?? "Desconocido")}`],
      };
    case "member.joined":
      return {
        title: `${String(payload.data.memberName ?? "Un miembro")} se unió al tablero`,
        lines: [
          `Email: ${String(payload.data.memberEmail ?? "Sin email")}`,
          `Rol: ${String(payload.data.role ?? "Sin rol")}`,
        ],
      };
  }
}

function buildBoardEventNotificationText(payload: BoardEventPayload<BoardEvent>) {
  const summary = buildBoardEventSummary(payload);
  const boardUrl = buildBoardUrl(payload.boardId);

  return [
    "Se recibió un evento del tablero en ProjectFlow.",
    `Evento: ${BOARD_EVENT_LABELS[payload.event]}`,
    `Tablero: ${payload.boardId}`,
    `Momento: ${formatFullDate(new Date(payload.timestamp))}`,
    "",
    summary.title,
    ...summary.lines.map((line) => `- ${line}`),
    boardUrl ? "" : null,
    boardUrl ? `Abrir tablero: ${boardUrl}` : null,
    "",
    "Payload recibido:",
    JSON.stringify(payload.data, null, 2),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function buildBoardEventNotificationHtml(payload: BoardEventPayload<BoardEvent>) {
  const summary = buildBoardEventSummary(payload);
  const boardUrl = buildBoardUrl(payload.boardId);

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#0f172a;">
      <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;margin:0 0 12px;">
        ProjectFlow
      </p>
      <h1 style="font-size:28px;line-height:1.2;margin:0 0 12px;">
        ${escapeHtml(BOARD_EVENT_LABELS[payload.event])}
      </h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:#334155;">
        ${escapeHtml(summary.title)}
      </p>
      <div style="border:1px solid #e2e8f0;border-radius:20px;padding:18px 20px;background:#f8fafc;margin:0 0 20px;">
        <p style="margin:0 0 8px;font-size:13px;color:#475569;">
          <strong>Board ID:</strong> ${escapeHtml(payload.boardId)}
        </p>
        <p style="margin:0 0 12px;font-size:13px;color:#475569;">
          <strong>Recibido:</strong> ${escapeHtml(formatFullDate(new Date(payload.timestamp)))}
        </p>
        <ul style="margin:0;padding-left:18px;color:#334155;">
          ${summary.lines
            .map((line) => `<li style="margin:0 0 6px;">${escapeHtml(line)}</li>`)
            .join("")}
        </ul>
      </div>
      ${
        boardUrl
          ? `
            <a
              href="${escapeHtml(boardUrl)}"
              style="display:inline-block;border-radius:16px;background:#0f766e;color:#ffffff;padding:14px 20px;text-decoration:none;font-weight:700;"
            >
              Abrir tablero
            </a>
          `
          : ""
      }
      <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
        <p style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin:0 0 10px;">
          Payload
        </p>
        <pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.6;padding:16px;border-radius:16px;background:#0f172a;color:#e2e8f0;overflow:auto;">${escapeHtml(
          JSON.stringify(payload.data, null, 2),
        )}</pre>
      </div>
    </div>
  `.trim();
}

export async function sendBoardEventNotificationEmail(
  payload: BoardEventPayload<BoardEvent>,
  recipients: string[],
): Promise<EmailDeliveryResult> {
  if (recipients.length === 0) {
    logWarn("email.board_event.skipped_missing_recipient", {
      event: payload.event,
      boardId: payload.boardId,
    });

    return {
      sent: false,
      reason: "No hay destinatarios configurados para esta notificación por email.",
    };
  }

  return sendEmail({
    to: recipients,
    subject: `[ProjectFlow] ${BOARD_EVENT_LABELS[payload.event]}`,
    htmlContent: buildBoardEventNotificationHtml(payload),
    textContent: buildBoardEventNotificationText(payload),
    logContext: {
      event: payload.event,
      boardId: payload.boardId,
    },
    missingConfigReason:
      "El evento del tablero se encoló, pero faltan BREVO_API_KEY y EMAIL_FROM_ADDRESS para enviar el correo.",
    missingConfigEvent: "email.board_event.skipped_missing_config",
    requestFailedEvent: "email.board_event.request_failed",
    providerRejectedEvent: "email.board_event.provider_rejected",
  });
}
