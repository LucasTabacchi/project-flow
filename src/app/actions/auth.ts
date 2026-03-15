"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  failure,
  fromZodError,
  type ActionResult,
  success,
} from "@/lib/action-result";
import { createSession, destroySession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { logError, logWarn } from "@/lib/observability";
import { getPrismaErrorMessage } from "@/lib/prisma-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 8;
const REGISTER_RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const REGISTER_RATE_LIMIT_MAX_ATTEMPTS = 5;

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getSafeRedirectTarget(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

async function getClientAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return (
    headerStore.get("x-real-ip") ??
    headerStore.get("cf-connecting-ip") ??
    "unknown"
  );
}

async function isAuthRateLimited(options: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}) {
  const clientAddress = await getClientAddress();
  const result = checkRateLimit({
    scope: options.scope,
    key: `${clientAddress}:${options.identifier.toLowerCase()}`,
    limit: options.limit,
    windowMs: options.windowMs,
  });

  if (!result.ok) {
    logWarn(`${options.scope}.rate_limited`, {
      clientAddress,
      identifier: options.identifier,
      resetAt: result.resetAt,
    });
  }

  return result.ok;
}

export type AuthActionState = ActionResult<{
  redirectTo: string;
}>;

export async function loginAction(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const redirectTo = getSafeRedirectTarget(getFormValue(formData, "redirectTo"));
  const email = getFormValue(formData, "email");
  const isAllowed = await isAuthRateLimited({
    scope: "auth.login",
    identifier: email || "anonymous",
    limit: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  });

  if (!isAllowed) {
    return failure("Demasiados intentos de acceso. Esperá unos minutos y volvé a probar.");
  }

  const parsed = loginSchema.safeParse({
    email,
    password: getFormValue(formData, "password"),
  });

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
    });

    if (!user) {
      logWarn("auth.login.rejected", {
        email: parsed.data.email,
        reason: "user_not_found",
      });
      return failure("No encontramos una cuenta con ese email.");
    }

    const isValidPassword = await verifyPassword(
      parsed.data.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      logWarn("auth.login.rejected", {
        email: parsed.data.email,
        userId: user.id,
        reason: "invalid_password",
      });
      return failure("La contraseña es incorrecta.");
    }

    await createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    });
    revalidatePath("/", "layout");

    return success({ redirectTo }, "Bienvenido de nuevo.");
  } catch (error) {
    logError("auth.login.failed", {
      email: parsed.data.email,
      error,
    });

    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos iniciar sesión en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}

export async function registerAction(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const redirectTo = getSafeRedirectTarget(getFormValue(formData, "redirectTo"));
  const email = getFormValue(formData, "email");
  const isAllowed = await isAuthRateLimited({
    scope: "auth.register",
    identifier: email || "anonymous",
    limit: REGISTER_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: REGISTER_RATE_LIMIT_WINDOW_MS,
  });

  if (!isAllowed) {
    return failure("Demasiados intentos de registro. Esperá un rato antes de volver a intentar.");
  }

  const parsed = registerSchema.safeParse({
    name: getFormValue(formData, "name"),
    email,
    password: getFormValue(formData, "password"),
    confirmPassword: getFormValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
    });

    if (existingUser) {
      logWarn("auth.register.rejected", {
        email: parsed.data.email,
        reason: "email_already_registered",
      });
      return failure("Ese email ya está registrado.");
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });

    await prisma.boardInvitation.updateMany({
      where: {
        email: user.email,
        inviteeId: null,
        status: "PENDING",
      },
      data: {
        inviteeId: user.id,
      },
    });

    await createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    });
    revalidatePath("/", "layout");

    return success({ redirectTo }, "Cuenta creada correctamente.");
  } catch (error) {
    logError("auth.register.failed", {
      email: parsed.data.email,
      error,
    });

    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos crear la cuenta en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}

export async function logoutAction() {
  await destroySession();
  revalidatePath("/", "layout");
}
