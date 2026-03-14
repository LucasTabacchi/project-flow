import { z } from "zod";

import { BOARD_ROLES, BOARD_THEMES, LABEL_COLORS } from "@/lib/constants";

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
  boardId: z.string().cuid(),
});

export const deleteBoardSchema = z.object({
  boardId: z.string().cuid(),
});

export const createListSchema = z.object({
  boardId: z.string().cuid(),
  name: z
    .string()
    .trim()
    .min(2, "La lista necesita un nombre.")
    .max(60, "El nombre de la lista es demasiado largo."),
});

export const updateListSchema = createListSchema.extend({
  listId: z.string().cuid(),
});

export const deleteListSchema = z.object({
  boardId: z.string().cuid(),
  listId: z.string().cuid(),
});

export const reorderListsSchema = z.object({
  boardId: z.string().cuid(),
  orderedIds: z.array(z.string().cuid()).min(1),
});

export const inviteMemberSchema = z.object({
  boardId: z.string().cuid(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un email válido."),
  role: z.enum(BOARD_ROLES.filter((role) => role !== "OWNER") as [string, ...string[]]),
});

export const respondInvitationSchema = z.object({
  invitationId: z.string().cuid(),
});

export const respondInvitationByTokenSchema = z.object({
  token: z.string().uuid(),
});

export const createLabelSchema = z.object({
  boardId: z.string().cuid(),
  name: z
    .string()
    .trim()
    .min(2, "La etiqueta necesita un nombre.")
    .max(32, "La etiqueta es demasiado larga."),
  color: z.enum(LABEL_COLORS),
});
