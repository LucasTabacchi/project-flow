import { z } from "zod";

import { CARD_PRIORITIES, CARD_STATUSES } from "@/lib/constants";
import { updateCardCustomFieldsSchema } from "@/lib/validators/custom-fields";

const entityIdSchema = z
  .string()
  .trim()
  .min(1, "Falta un identificador.")
  .max(120, "El identificador es demasiado largo.")
  .regex(/^[A-Za-z0-9_-]+$/, "El identificador tiene un formato inválido.");

const dueDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    "La fecha límite no es válida.",
  );

export const createCardSchema = z.object({
  boardId: entityIdSchema,
  listId: entityIdSchema,
  title: z
    .string()
    .trim()
    .min(2, "La tarjeta necesita un título.")
    .max(120, "El título es demasiado largo."),
});

export const updateCardSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  title: z
    .string()
    .trim()
    .min(2, "La tarjeta necesita un título.")
    .max(120, "El título es demasiado largo."),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción es demasiado larga.")
    .optional()
    .transform((value) => value || undefined),
  dueDate: dueDateSchema,
  priority: z.enum(CARD_PRIORITIES),
  status: z.enum(CARD_STATUSES),
  labelIds: z.array(entityIdSchema).default([]),
  assigneeIds: z.array(entityIdSchema).default([]),
  // ── Ronda 1: tiempo estimado ──────────────────────────────────────────────
  estimatedMinutes: z
    .number()
    .int("El tiempo estimado debe ser un número entero.")
    .min(0, "El tiempo estimado no puede ser negativo.")
    .max(99999, "El tiempo estimado es demasiado grande.")
    .nullable()
    .optional(),
  customFieldValues: updateCardCustomFieldsSchema.shape.customFieldValues,
  // ─────────────────────────────────────────────────────────────────────────
});

export const deleteCardSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
});

export const reorderCardsSchema = z.object({
  boardId: entityIdSchema,
  lists: z.array(
    z.object({
      id: entityIdSchema,
      cardIds: z.array(entityIdSchema),
    }),
  ),
});

export const addCommentSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  body: z
    .string()
    .trim()
    .min(2, "El comentario es demasiado corto.")
    .max(1000, "El comentario es demasiado largo."),
});

export const addChecklistSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  title: z
    .string()
    .trim()
    .min(2, "El checklist necesita un nombre.")
    .max(80, "El nombre del checklist es demasiado largo."),
});

export const addChecklistItemSchema = z.object({
  boardId: entityIdSchema,
  checklistId: entityIdSchema,
  title: z
    .string()
    .trim()
    .min(2, "El item es demasiado corto.")
    .max(140, "El item es demasiado largo."),
});

export const toggleChecklistItemSchema = z.object({
  boardId: entityIdSchema,
  itemId: entityIdSchema,
  isCompleted: z.boolean(),
});

export const createAttachmentSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  name: z
    .string()
    .trim()
    .min(2, "El adjunto necesita un nombre.")
    .max(120, "El nombre del adjunto es demasiado largo."),
  url: z
    .string()
    .trim()
    .url("Ingresá una URL válida.")
    .max(500, "La URL es demasiado larga."),
});

// ── Ronda 1: tiempo tracking ──────────────────────────────────────────────────

export const logTimeSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  minutes: z
    .number()
    .int("Los minutos deben ser un número entero.")
    .min(1, "El tiempo debe ser mayor a 0.")
    .max(1440, "No podés registrar más de 24 horas de una vez."),
  note: z
    .string()
    .trim()
    .max(200, "La nota es demasiado larga.")
    .optional()
    .transform((v) => v || undefined),
});

export const deleteTimeEntrySchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  entryId: entityIdSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
