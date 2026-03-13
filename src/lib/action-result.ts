import type { ZodError } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = void> =
  | {
      ok: true;
      message?: string;
      data?: T;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
    };

export function success<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function failure(
  message: string,
  fieldErrors?: FieldErrors,
): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

export function fromZodError(error: ZodError): ActionResult<never> {
  return failure("Hay campos con formato inválido.", error.flatten().fieldErrors);
}
