import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta | ProjectFlow",
  description:
    "Creá tu cuenta de ProjectFlow para empezar a organizar tableros, listas y tarjetas.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crear tu cuenta"
      subtitle="Activá tu espacio y empezá a organizar proyectos con claridad."
      asideLink={{
        href: "/login",
        label: "Ya tengo cuenta",
      }}
      footer={
        <>
          Las invitaciones pendientes por email se vinculan automáticamente
          cuando terminás el registro.
        </>
      }
    >
      <Suspense fallback={<AuthFormFallback />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
