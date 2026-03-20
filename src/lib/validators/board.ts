import { z } from "zod";

import { BOARD_ROLES, BOARD_THEMES, LABEL_COLORS } from "@/lib/constants";

const entityIdSchema = z
  .string()
  .trim()
  .min(1, "Falta un identificador.")
  .max(120, "El identificador es demasiado largo.")
  .regex(/^[A-Za-z0-9_-]+$/, "El identificador tiene un formato inválido.");

export const createBoardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El tablero necesita un nombre más claro.")
    .max(80, "El nombre del tablero es demasiado largo."),
  description: z
    .string()
    .trim()
    .max(240, "La descripción es demasiado larga.")
    .optional()
    .transform((value) => value || undefined),
  theme: z.enum(BOARD_THEMES.map((theme) => theme.value) as [string, ...string[]]),
});

export const updateBoardSchema = createBoardSchema.extend({
  boardId: entityIdSchema,
});

export const deleteBoardSchema = z.object({
  boardId: entityIdSchema,
});

export const leaveBoardSchema = z.object({
  boardId: entityIdSchema,
});

export const createListSchema = z.object({
  boardId: entityIdSchema,
  name: z
    .string()
    .trim()
    .min(2, "La lista necesita un nombre.")
    .max(60, "El nombre de la lista es demasiado largo."),
});

export const updateListSchema = createListSchema.extend({
  listId: entityIdSchema,
});

export const deleteListSchema = z.object({
  boardId: entityIdSchema,
  listId: entityIdSchema,
});

export const reorderListsSchema = z.object({
  boardId: entityIdSchema,
  orderedIds: z.array(entityIdSchema).min(1),
});

export const inviteMemberSchema = z.object({
  boardId: entityIdSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un email válido."),
  role: z.enum(BOARD_ROLES.filter((role) => role !== "OWNER") as [string, ...string[]]),
});

export const respondInvitationSchema = z.object({
  invitationId: entityIdSchema,
});

export const respondInvitationByTokenSchema = z.object({
  token: z.string().uuid(),
});

export const createLabelSchema = z.object({
  boardId: entityIdSchema,
  name: z
    .string()
    .trim()
    .min(2, "La etiqueta necesita un nombre.")
    .max(32, "La etiqueta es demasiado larga."),
  color: z.enum(LABEL_COLORS),
});
