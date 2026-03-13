"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { loginAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Ingresando..." : "Iniciar sesión"}
    </Button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<AuthActionState | null, FormData>(
    loginAction,
    null,
  );

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.ok) {
      toast.success(state.message ?? "Sesión iniciada.");
      router.push(state.data?.redirectTo ?? "/dashboard");
      router.refresh();
      return;
    }

    toast.error(state.message);
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="tu@email.com" />
        {state && !state.ok && state.fieldErrors?.email?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <span className="text-xs text-muted-foreground">Demo1234!</span>
        </div>
        <Input id="password" name="password" type="password" />
        {state && !state.ok && state.fieldErrors?.password?.[0] ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton />

      <div className="rounded-[24px] border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        Tip rápido: si ejecutás el seed, podés entrar con
        <span className="font-medium text-foreground"> sofia@projectflow.dev</span>.
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="font-semibold text-primary">
          Registrate
        </Link>
      </p>
    </form>
  );
}
