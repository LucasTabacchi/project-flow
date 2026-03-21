import { z } from "zod";

import { CUSTOM_FIELD_TYPES } from "@/lib/constants";

const entityIdSchema = z
  .string()
  .trim()
  .min(1, "Falta un identificador.")
  .max(120, "El identificador es demasiado largo.")
  .regex(/^[A-Za-z0-9_-]+$/, "El identificador tiene un formato inválido.");

const customFieldNameSchema = z
  .string()
  .trim()
  .min(2, "El campo necesita un nombre.")
  .max(40, "El nombre del campo es demasiado largo.");

const customFieldOptionSchema = z
  .string()
  .trim()
  .min(1, "Las opciones no pueden estar vacías.")
  .max(40, "La opción es demasiado larga.");

const customFieldTypeSchema = z.enum(CUSTOM_FIELD_TYPES);

const baseBoardCustomFieldSchema = z
  .object({
    boardId: entityIdSchema,
    name: customFieldNameSchema,
    type: customFieldTypeSchema,
    options: z.array(customFieldOptionSchema).default([]),
  })
  .superRefine((input, ctx) => {
    if (input.type === "SELECT" && input.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Los campos de selección necesitan al menos dos opciones.",
      });
    }
  });

export const createBoardCustomFieldSchema = baseBoardCustomFieldSchema;

export const updateBoardCustomFieldSchema = baseBoardCustomFieldSchema.extend({
  fieldId: entityIdSchema,
});

export const deleteBoardCustomFieldSchema = z.object({
  boardId: entityIdSchema,
  fieldId: entityIdSchema,
});

export const updateCardCustomFieldsSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  customFieldValues: z.array(
    z.object({
      fieldId: entityIdSchema,
      textValue: z
        .string()
        .trim()
        .max(240, "El valor es demasiado largo.")
        .nullable()
        .optional(),
      numberValue: z
        .number()
        .finite("El valor numérico es inválido.")
        .min(-999999999, "El número es demasiado chico.")
        .max(999999999, "El número es demasiado grande.")
        .nullable()
        .optional(),
      optionValue: z
        .string()
        .trim()
        .max(40, "La opción es demasiado larga.")
        .nullable()
        .optional(),
    }),
  ).default([]),
});
