import { z } from "zod";

const entityIdSchema = z
  .string()
  .trim()
  .min(1, "Falta un identificador.")
  .max(120, "El identificador es demasiado largo.")
  .regex(/^[A-Za-z0-9_-]+$/, "El identificador tiene un formato inválido.");

export const createCardDependencySchema = z
  .object({
    boardId: entityIdSchema,
    focusCardId: entityIdSchema,
    blockerCardId: entityIdSchema,
    blockedCardId: entityIdSchema,
  })
  .superRefine((value, ctx) => {
    if (value.blockerCardId === value.blockedCardId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blockedCardId"],
        message: "Una tarjeta no puede depender de sí misma.",
      });
    }

    if (
      value.focusCardId !== value.blockerCardId &&
      value.focusCardId !== value.blockedCardId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["focusCardId"],
        message: "La tarjeta abierta tiene que participar en la dependencia.",
      });
    }
  });

export const deleteCardDependencySchema = z.object({
  boardId: entityIdSchema,
  focusCardId: entityIdSchema,
  dependencyId: entityIdSchema,
});
