import type { Metadata } from "next";

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
      title="Crear cuenta"
      subtitle="Empezá a organizar proyectos, listas y tarjetas en minutos."
      asideLink={{
        href: "/login",
        label: "Ya tenés cuenta, iniciá sesión",
      }}
      footer={
        <>
          Las invitaciones pendientes por email se vinculan automáticamente al
          crear la cuenta.
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
