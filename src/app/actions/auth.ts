"use server";

import { revalidatePath } from "next/cache";

import {
  failure,
  fromZodError,
  type ActionResult,
  success,
} from "@/lib/action-result";
import { createSession, destroySession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { getPrismaErrorMessage } from "@/lib/prisma-error";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export type AuthActionState = ActionResult<{
  redirectTo: string;
}>;

export async function loginAction(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: getFormValue(formData, "email"),
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
      return failure("No encontramos una cuenta con ese email.");
    }

    const isValidPassword = await verifyPassword(
      parsed.data.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      return failure("La contraseña es incorrecta.");
    }

    await createSession(user.id);
    revalidatePath("/", "layout");

    return success({ redirectTo: "/dashboard" }, "Bienvenido de nuevo.");
  } catch (error) {
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
  const parsed = registerSchema.safeParse({
    name: getFormValue(formData, "name"),
    email: getFormValue(formData, "email"),
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

    await createSession(user.id);
    revalidatePath("/", "layout");

    return success({ redirectTo: "/dashboard" }, "Cuenta creada correctamente.");
  } catch (error) {
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
