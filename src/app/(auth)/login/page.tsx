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
      title="Bienvenido de nuevo"
      subtitle="Ingresá para revisar tableros, fechas de entrega y trabajo compartido."
      asideLink={{
        href: "/register",
        label: "Crear cuenta",
      }}
      footer={
        <>
          Si recibiste una invitación por email, iniciá sesión con esa misma
          dirección para sumarte a los tableros compartidos.
        </>
      }
      showDemoCredentials={showDemoCredentials}
    >
      <LoginForm />
    </AuthShell>
  );
}
