"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" />
          Ingresando...
        </>
      ) : (
        "Iniciar sesión"
      )}
    </Button>
  );
}

export function LoginForm() {
  const router = useRouter();
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

    router.replace(state.data?.redirectTo ?? "/dashboard");
  }, [router, state]);

  return (
    <form action={formAction} noValidate className="space-y-5">
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      <div className="rounded-[24px] border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Acceso a tu espacio de trabajo</p>
            <p>
              Ingresá con el email de tu cuenta o con la dirección donde
              recibiste una invitación del equipo.
            </p>
          </div>
        </div>
      </div>

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
            size="icon"
            className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-xl text-muted-foreground hover:text-foreground"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
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
        <Link href={registerHref} className="font-semibold text-primary">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
