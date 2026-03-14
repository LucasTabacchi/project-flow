import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { addDays } from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_DURATION_DAYS } from "@/lib/constants";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "projectflow_session";

const SESSION_SECRET =
  process.env.SESSION_SECRET ??
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  process.env.DATABASE_URL ??
  "projectflow-development-session-secret";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
};

type SessionPayload = {
  exp: number;
  user: SessionUser;
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

function signValue(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = Buffer.from(signValue(encodedPayload));
  const actualSignature = Buffer.from(signature);

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    if (
      typeof payload.exp !== "number" ||
      !payload.user ||
      typeof payload.user.id !== "string" ||
      typeof payload.user.name !== "string" ||
      typeof payload.user.email !== "string"
    ) {
      return null;
    }

    return {
      exp: payload.exp,
      user: normalizeUser({
        id: payload.user.id,
        name: payload.user.name,
        email: payload.user.email,
        avatarUrl: payload.user.avatarUrl ?? null,
        bio: payload.user.bio ?? null,
      }),
    };
  } catch {
    return null;
  }
}

async function writeSessionCookie(payload: SessionPayload) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.exp),
  });
}

export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeSession(token);

  if (!payload) {
    return null;
  }

  if (payload.exp < Date.now()) {
    return null;
  }

  return {
    expiresAt: new Date(payload.exp),
    user: payload.user,
  };
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
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

  await writeSessionCookie({
    exp: expiresAt.getTime(),
    user: normalizeUser(user),
  });
}

export async function updateSessionUser(user: SessionUser) {
  const currentSession = await getCurrentSession();

  if (!currentSession) {
    return;
  }

  await writeSessionCookie({
    exp: currentSession.expiresAt.getTime(),
    user: normalizeUser(user),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
