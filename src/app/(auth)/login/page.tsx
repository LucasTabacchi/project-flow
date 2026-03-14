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

type LoginPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    redirectTo?: string | string[];
  }>;
};

function getSingleSearchParam(value?: string | string[]) {
  return typeof value === "string" ? value : value?.[0];
}

function buildAuthHref(
  pathname: string,
  redirectTo?: string,
  email?: string,
) {
  const params = new URLSearchParams();

  if (redirectTo) {
    params.set("redirectTo", redirectTo);
  }

  if (email) {
    params.set("email", email);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const email = getSingleSearchParam(params.email);
  const redirectTo = getSingleSearchParam(params.redirectTo);

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresá para revisar tableros, fechas de entrega y trabajo compartido."
      asideLink={{
        href: buildAuthHref("/register", redirectTo, email),
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
      <LoginForm
        initialEmail={email}
        redirectTo={redirectTo}
        registerHref={buildAuthHref("/register", redirectTo, email)}
      />
    </AuthShell>
  );
}
