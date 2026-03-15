"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAuthHref, getSafeRedirectTarget } from "@/lib/auth/navigation";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Ingresando..." : "Iniciar sesión"}
    </Button>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<AuthActionState | null, FormData>(
    loginAction,
    null,
  );
  const email = searchParams.get("email");
  const redirectTo = getSafeRedirectTarget(searchParams.get("redirectTo"));
  const registerHref = buildAuthHref("/register", {
    email,
    redirectTo,
  });

  const emailError =
    state && !state.ok ? state.fieldErrors?.email?.[0] : undefined;
  const passwordError =
    state && !state.ok ? state.fieldErrors?.password?.[0] : undefined;
  const hasFieldErrors = Boolean(emailError || passwordError);
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
    <form action={formAction} noValidate className="space-y-5">
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nombre@empresa.com"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          defaultValue={email ?? undefined}
          required
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "login-email-error" : undefined}
        />
        {emailError ? (
          <p id="login-email-error" className="text-xs text-destructive">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            required
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "login-password-error" : undefined}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        {passwordError ? (
          <p id="login-password-error" className="text-xs text-destructive">
            {passwordError}
          </p>
        ) : null}
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        ¿Todavía no tenés cuenta?{" "}
        <a href={registerHref} className="font-semibold text-primary">
          Crear cuenta
        </a>
      </p>
    </form>
  );
}
