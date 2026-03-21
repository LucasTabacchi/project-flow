import { z } from "zod";

import { CARD_STATUSES } from "@/lib/constants";

const entityIdSchema = z
  .string()
  .trim()
  .min(1, "Falta un identificador.")
  .max(120, "El identificador es demasiado largo.")
  .regex(/^[A-Za-z0-9_-]+$/, "El identificador tiene un formato inválido.");

const emailArraySchema = z
  .array(z.string().trim().email("Ingresá un email válido."))
  .max(10, "Podés configurar hasta 10 destinatarios por regla.");

export const createBoardAutomationRuleSchema = z.object({
  boardId: entityIdSchema,
  name: z
    .string()
    .trim()
    .min(2, "La automatización necesita un nombre.")
    .max(120, "El nombre es demasiado largo."),
  triggerStatus: z.enum(CARD_STATUSES),
  moveToListId: entityIdSchema.nullable().optional(),
  assignUserIds: z.array(entityIdSchema).max(20, "Podés asignar hasta 20 miembros."),
  dueInDays: z
    .number()
    .int("Los días deben ser un número entero.")
    .min(0, "Los días no pueden ser negativos.")
    .max(90, "No podés configurar más de 90 días.")
    .nullable()
    .optional(),
  emailRecipients: emailArraySchema,
  active: z.boolean().default(true),
}).superRefine((value, ctx) => {
  const hasAction =
    Boolean(value.moveToListId) ||
    value.assignUserIds.length > 0 ||
    value.dueInDays != null ||
    value.emailRecipients.length > 0;

  if (!hasAction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Configurá al menos una acción para esta automatización.",
      path: ["moveToListId"],
    });
  }
});

export const toggleBoardAutomationRuleSchema = z.object({
  boardId: entityIdSchema,
  automationRuleId: entityIdSchema,
  active: z.boolean(),
});

export const deleteBoardAutomationRuleSchema = z.object({
  boardId: entityIdSchema,
  automationRuleId: entityIdSchema,
});
