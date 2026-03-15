import "server-only";

import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_DURATION_DAYS } from "@/lib/constants";
import { prisma } from "@/lib/db";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "projectflow_session";
const SESSION_TOKEN_BYTES = 32;

type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
};

function normalizeUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
  };
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

async function getSessionTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

async function deleteSessionRecord(token: string | null) {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: {
      tokenHash: hashSessionToken(token),
    },
  });
}

async function writeSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export const getCurrentSession = cache(async () => {
  const token = await getSessionTokenFromCookie();

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session
      .delete({
        where: {
          id: session.id,
        },
      })
      .catch(() => undefined);

    return null;
  }

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    user: normalizeUser(session.user),
  };
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
});

export const getCurrentUserId = cache(async () => {
  const token = await getSessionTokenFromCookie();

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session
      .delete({
        where: {
          id: session.id,
        },
      })
      .catch(() => undefined);

    return null;
  }

  return session.userId;
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function createSession(user: SessionUser) {
  const expiresAt = addDays(new Date(), SESSION_DURATION_DAYS);
  const token = createSessionToken();
  const currentToken = await getSessionTokenFromCookie();

  await prisma.$transaction([
    ...(currentToken
      ? [
          prisma.session.deleteMany({
            where: {
              tokenHash: hashSessionToken(currentToken),
            },
          }),
        ]
      : []),
    prisma.session.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId: user.id,
        expiresAt,
      },
    }),
  ]);

  await writeSessionCookie(token, expiresAt);
}

export async function destroySession() {
  const token = await getSessionTokenFromCookie();
  const cookieStore = await cookies();

  await deleteSessionRecord(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
}
