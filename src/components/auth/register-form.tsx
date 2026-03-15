"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { registerAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAuthHref, getSafeRedirectTarget } from "@/lib/auth/navigation";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creando cuenta..." : "Crear cuenta"}
    </Button>
  );
}

export function RegisterForm() {
  const searchParams = useSearchParams();
  const [state, formAction] = useActionState<AuthActionState | null, FormData>(
    registerAction,
    null,
  );
  const initialEmail = searchParams.get("email");
  const redirectTo = getSafeRedirectTarget(searchParams.get("redirectTo"));
  const loginHref = buildAuthHref("/login", {
    email: initialEmail,
    redirectTo,
  });
  const nameError =
    state && !state.ok ? state.fieldErrors?.name?.[0] : undefined;
  const emailError =
    state && !state.ok ? state.fieldErrors?.email?.[0] : undefined;
  const passwordError =
    state && !state.ok ? state.fieldErrors?.password?.[0] : undefined;
  const confirmPasswordError =
    state && !state.ok ? state.fieldErrors?.confirmPassword?.[0] : undefined;
  const hasFieldErrors = Boolean(
    nameError || emailError || passwordError || confirmPasswordError,
  );
  const generalError =
    state && !state.ok && (!hasFieldErrors || !state.fieldErrors)
      ? state.message
      : undefined;

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    window.location.replace(state.data?.redirectTo ?? "/dashboard");
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      {generalError ? (
        <div
          role="alert"
          className="rounded-[20px] border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {generalError}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder="Tu nombre" />
        {nameError ? (
          <p className="text-xs text-destructive">{nameError}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          defaultValue={initialEmail ?? undefined}
        />
        {emailError ? (
          <p className="text-xs text-destructive">{emailError}</p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" />
          {passwordError ? (
            <p className="text-xs text-destructive">{passwordError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" />
          {confirmPasswordError ? (
            <p className="text-xs text-destructive">{confirmPasswordError}</p>
          ) : null}
        </div>
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <a href={loginHref} className="font-semibold text-primary">
          Iniciá sesión
        </a>
      </p>
    </form>
  );
}
