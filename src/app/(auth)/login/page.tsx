import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

const showDemoCredentials =
  process.env.NODE_ENV !== "production" ||
  process.env.SHOW_DEMO_CREDENTIALS === "true";

export const metadata: Metadata = {
  title: "Iniciar sesión | ProjectFlow",
  description:
    "Ingresá a ProjectFlow para acceder a tus tableros, tareas y colaboración del equipo.",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar a ProjectFlow"
      subtitle="Accedé a tus tableros, tareas y colaboración del equipo."
      asideLink={{
        href: "/register",
        label: "Crear una cuenta nueva",
      }}
      footer={
        <>
          Iniciá sesión con tu cuenta o con el email donde recibiste una
          invitación del tablero.
        </>
      }
      showDemoCredentials={showDemoCredentials}
    >
      <LoginForm />
    </AuthShell>
  );
}
