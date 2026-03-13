"use server";

import { revalidatePath } from "next/cache";

import {
  failure,
  fromZodError,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators/profile";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  if (!user) {
    return failure("Necesitás iniciar sesión.");
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl || null,
      bio: parsed.data.bio || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/", "layout");

  return success(undefined, "Perfil actualizado.");
}
