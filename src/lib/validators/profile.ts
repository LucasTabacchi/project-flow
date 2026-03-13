import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre es demasiado corto.")
    .max(80, "El nombre es demasiado largo."),
  avatarUrl: z
    .string()
    .trim()
    .url("Ingresá una URL válida.")
    .max(500, "La URL es demasiado larga.")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(240, "La bio es demasiado larga.")
    .optional()
    .or(z.literal("")),
});
