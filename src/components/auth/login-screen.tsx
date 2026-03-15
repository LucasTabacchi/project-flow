import { Suspense } from "react";

import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { LoginAccessNote } from "@/components/auth/login-access-note";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

const showDemoCredentials =
  process.env.NODE_ENV !== "production" ||
  process.env.SHOW_DEMO_CREDENTIALS === "true";

export function LoginScreen() {
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
      <div className="space-y-5">
        <LoginAccessNote />
        <Suspense fallback={<AuthFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}
