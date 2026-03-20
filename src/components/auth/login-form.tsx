"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { loginAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAuthHref, getSafeRedirectTarget } from "@/lib/auth/navigation";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Ingresando...
        </span>
      ) : (
        "Iniciar sesión"
      )}
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
  const registerHref = buildAuthHref("/register", { email, redirectTo });

  const emailError = state && !state.ok ? state.fieldErrors?.email?.[0] : undefined;
  const passwordError = state && !state.ok ? state.fieldErrors?.password?.[0] : undefined;
  const hasFieldErrors = Boolean(emailError || passwordError);
  const generalError =
    state && !state.ok && (!hasFieldErrors || !state.fieldErrors)
      ? state.message
      : undefined;

  useEffect(() => {
    if (!state?.ok) return;
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
          className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/6 px-4 py-3 text-sm text-destructive"
        >
          <svg className="mt-0.5 size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {generalError}
        </div>
      ) : null}

      {/* Email field */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Email
        </Label>
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
          className={emailError ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
        />
        {emailError ? (
          <p id="login-email-error" className="text-xs text-destructive">
            {emailError}
          </p>
        ) : null}
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Contraseña
          </Label>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={`pr-11 ${passwordError ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}`}
            required
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "login-password-error" : undefined}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {passwordError ? (
          <p id="login-password-error" className="text-xs text-destructive">
            {passwordError}
          </p>
        ) : null}
      </div>

      <SubmitButton />

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs text-muted-foreground">o</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿Todavía no tenés cuenta?{" "}
        <a
          href={registerHref}
          className="font-semibold text-primary underline-offset-4 transition-all hover:underline hover:text-primary/80 hover:brightness-110"
        >
          Crear cuenta
        </a>
      </p>
    </form>
  );
}
