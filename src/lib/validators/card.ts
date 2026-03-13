import { z } from "zod";

import { CARD_PRIORITIES, CARD_STATUSES } from "@/lib/constants";

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
  boardId: z.string().cuid(),
  listId: z.string().cuid(),
  title: z
    .string()
    .trim()
    .min(2, "La tarjeta necesita un título.")
    .max(120, "El título es demasiado largo."),
});

export const updateCardSchema = z.object({
  boardId: z.string().cuid(),
  cardId: z.string().cuid(),
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
  labelIds: z.array(z.string().cuid()).default([]),
  assigneeIds: z.array(z.string().cuid()).default([]),
});

export const deleteCardSchema = z.object({
  boardId: z.string().cuid(),
  cardId: z.string().cuid(),
});

export const reorderCardsSchema = z.object({
  boardId: z.string().cuid(),
  lists: z.array(
    z.object({
      id: z.string().cuid(),
      cardIds: z.array(z.string().cuid()),
    }),
  ),
});

export const addCommentSchema = z.object({
  boardId: z.string().cuid(),
  cardId: z.string().cuid(),
  body: z
    .string()
    .trim()
    .min(2, "El comentario es demasiado corto.")
    .max(1000, "El comentario es demasiado largo."),
});

export const addChecklistSchema = z.object({
  boardId: z.string().cuid(),
  cardId: z.string().cuid(),
  title: z
    .string()
    .trim()
    .min(2, "El checklist necesita un nombre.")
    .max(80, "El nombre del checklist es demasiado largo."),
});

export const addChecklistItemSchema = z.object({
  boardId: z.string().cuid(),
  checklistId: z.string().cuid(),
  title: z
    .string()
    .trim()
    .min(2, "El item es demasiado corto.")
    .max(140, "El item es demasiado largo."),
});

export const toggleChecklistItemSchema = z.object({
  boardId: z.string().cuid(),
  itemId: z.string().cuid(),
  isCompleted: z.boolean(),
});

export const createAttachmentSchema = z.object({
  boardId: z.string().cuid(),
  cardId: z.string().cuid(),
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
