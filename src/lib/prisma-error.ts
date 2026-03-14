import { Prisma } from "@prisma/client";

const CONNECTION_ERROR_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1010",
  "P1011",
  "P1017",
  "P2024",
]);

const SCHEMA_ERROR_CODES = new Set(["P2021", "P2022"]);

export function getPrismaErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  console.error("[prisma]", error);

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "No pudimos conectarnos con la base de datos. Revisá las variables de entorno y volvé a intentar.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (SCHEMA_ERROR_CODES.has(error.code)) {
      return "La base de datos todavía no está lista. Aplicá el esquema y cargá los datos iniciales antes de volver a intentar.";
    }

    if (CONNECTION_ERROR_CODES.has(error.code)) {
      return "No pudimos conectarnos con la base de datos. Revisá la configuración de Supabase o intentá de nuevo en unos minutos.";
    }
  }

  if (
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return "La base de datos respondió con un error inesperado. Revisá los logs del servidor y volvé a intentar.";
  }

  return fallbackMessage;
}
