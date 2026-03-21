import "server-only";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { getPriorityLabel, getStatusLabel } from "@/lib/utils";
import type { BoardPageData, CardSummaryView } from "@/types";

export type BoardExportFormat = "csv" | "pdf";

function sanitizeFilename(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "tablero";
}

function formatDate(value: string | null, pattern = "dd/MM/yyyy") {
  if (!value) {
    return "";
  }

  return format(new Date(value), pattern, { locale: es });
}

function formatDateTime(value: string) {
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: es });
}

function csvCell(value: string | number | null | undefined) {
  const serialized = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${serialized.replace(/"/g, "\"\"")}"`;
}

function formatAssignees(card: CardSummaryView) {
  return card.assignees.map((assignee) => assignee.name).join(", ");
}

function formatLabels(card: CardSummaryView) {
  return card.labels.map((label) => label.name).join(", ");
}

function formatChecklist(card: CardSummaryView) {
  if (!card.checklistTotal) {
    return "";
  }

  return `${card.checklistCompleted}/${card.checklistTotal}`;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      continue;
    }

    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        currentLine = word;
        continue;
      }

      let chunk = "";
      for (const char of word) {
        const nextChunk = `${chunk}${char}`;
        if (font.widthOfTextAtSize(nextChunk, fontSize) <= maxWidth) {
          chunk = nextChunk;
          continue;
        }

        if (chunk) {
          lines.push(chunk);
        }
        chunk = char;
      }
      currentLine = chunk;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length ? lines : [""];
}

function buildCardMeta(card: CardSummaryView) {
  const meta = [
    `Estado: ${getStatusLabel(card.status)}`,
    `Prioridad: ${getPriorityLabel(card.priority)}`,
    `Vencimiento: ${formatDate(card.dueDate) || "Sin fecha"}`,
  ];

  const assignees = formatAssignees(card);
  if (assignees) {
    meta.push(`Responsables: ${assignees}`);
  }

  const labels = formatLabels(card);
  if (labels) {
    meta.push(`Etiquetas: ${labels}`);
  }

  if (card.checklistTotal) {
    meta.push(`Checklist: ${formatChecklist(card)}`);
  }

  if (card.estimatedMinutes !== null) {
    meta.push(`Estimado: ${card.estimatedMinutes} min`);
  }

  meta.push(`Registrado: ${card.trackedMinutes} min`);

  return meta.join(" | ");
}

export function getBoardExportFilename(boardName: string, format: BoardExportFormat) {
  return `${sanitizeFilename(boardName)}.${format}`;
}

export function createBoardCsv(board: BoardPageData) {
  const header = [
    "Tablero",
    "Lista",
    "Titulo",
    "Descripcion",
    "Estado",
    "Prioridad",
    "Vencimiento",
    "Responsables",
    "Etiquetas",
    "Checklist",
    "Comentarios",
    "Adjuntos",
    "Tiempo estimado (min)",
    "Tiempo registrado (min)",
    "Actualizado",
  ];

  const rows = board.lists.flatMap((list) =>
    list.cards.map((card) => [
      board.name,
      list.name,
      card.title,
      card.description ?? "",
      getStatusLabel(card.status),
      getPriorityLabel(card.priority),
      formatDate(card.dueDate),
      formatAssignees(card),
      formatLabels(card),
      formatChecklist(card),
      card.commentCount,
      card.attachmentCount,
      card.estimatedMinutes ?? "",
      card.trackedMinutes,
      formatDateTime(card.updatedAt),
    ]),
  );

  return [header, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n");
}

export async function createBoardPdf(board: BoardPageData) {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize = PageSizes.A4;
  const margin = 48;
  const sectionGap = 12;
  const bodyLineHeight = 14;
  const muted = rgb(0.36, 0.4, 0.47);
  const titleColor = rgb(0.1, 0.14, 0.2);
  const accent = rgb(0.05, 0.42, 0.39);

  let page = pdf.addPage(pageSize);
  let { width, height } = page.getSize();
  let y = height - margin;

  function addPage() {
    page = pdf.addPage(pageSize);
    ({ width, height } = page.getSize());
    y = height - margin;
  }

  function ensureSpace(spaceNeeded: number) {
    if (y - spaceNeeded < margin) {
      addPage();
    }
  }

  function drawWrappedLine(options: {
    text: string;
    font: PDFFont;
    fontSize: number;
    color?: ReturnType<typeof rgb>;
    x?: number;
    lineHeight?: number;
    gapAfter?: number;
  }) {
    const x = options.x ?? margin;
    const lineHeight = options.lineHeight ?? options.fontSize + 3;
    const maxWidth = width - x - margin;
    const lines = wrapText(options.text, options.font, options.fontSize, maxWidth);

    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x,
        y,
        size: options.fontSize,
        font: options.font,
        color: options.color ?? titleColor,
      });
      y -= lineHeight;
    }

    y -= options.gapAfter ?? 0;
  }

  function drawSeparator() {
    ensureSpace(10);
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.88, 0.9, 0.93),
    });
    y -= sectionGap;
  }

  drawWrappedLine({
    text: board.name,
    font: boldFont,
    fontSize: 22,
    color: titleColor,
    lineHeight: 24,
    gapAfter: 6,
  });
  drawWrappedLine({
    text: `Exportado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
    font: regularFont,
    fontSize: 10,
    color: muted,
    gapAfter: 10,
  });

  if (board.description) {
    drawWrappedLine({
      text: board.description,
      font: regularFont,
      fontSize: 11,
      color: titleColor,
      lineHeight: bodyLineHeight,
      gapAfter: 10,
    });
  }

  drawWrappedLine({
    text: `Resumen: ${board.stats.totalCards} tarjetas | ${board.stats.completedCards} completadas | ${board.stats.inProgressCards} en progreso | ${board.stats.overdueCards} vencidas`,
    font: boldFont,
    fontSize: 10,
    color: accent,
    gapAfter: 4,
  });
  drawWrappedLine({
    text: `Miembros: ${board.members.map((member) => member.name).join(", ") || "Sin miembros"}`,
    font: regularFont,
    fontSize: 10,
    color: muted,
    gapAfter: 4,
  });
  drawWrappedLine({
    text: `Etiquetas: ${board.labels.map((label) => label.name).join(", ") || "Sin etiquetas"}`,
    font: regularFont,
    fontSize: 10,
    color: muted,
    gapAfter: 10,
  });

  drawSeparator();

  for (const list of board.lists) {
    drawWrappedLine({
      text: `${list.name} (${list.cards.length})`,
      font: boldFont,
      fontSize: 14,
      color: titleColor,
      lineHeight: 18,
      gapAfter: 6,
    });

    if (!list.cards.length) {
      drawWrappedLine({
        text: "Sin tarjetas.",
        font: regularFont,
        fontSize: 10,
        color: muted,
        gapAfter: 10,
      });
      continue;
    }

    list.cards.forEach((card, index) => {
      drawWrappedLine({
        text: `${index + 1}. ${card.title}`,
        font: boldFont,
        fontSize: 11,
        color: titleColor,
        x: margin + 6,
        lineHeight: bodyLineHeight,
        gapAfter: 2,
      });
      drawWrappedLine({
        text: buildCardMeta(card),
        font: regularFont,
        fontSize: 9,
        color: muted,
        x: margin + 16,
        lineHeight: 12,
        gapAfter: card.description ? 2 : 8,
      });

      if (card.description) {
        drawWrappedLine({
          text: card.description,
          font: regularFont,
          fontSize: 9,
          color: titleColor,
          x: margin + 16,
          lineHeight: 12,
          gapAfter: 8,
        });
      }
    });

    y -= 4;
  }

  return pdf.save();
}
