import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta | ProjectFlow",
  description:
    "Creá tu cuenta de ProjectFlow para empezar a organizar tableros, listas y tarjetas.",
};

type RegisterPageProps = {
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

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const email = getSingleSearchParam(params.email);
  const redirectTo = getSingleSearchParam(params.redirectTo);

  return (
    <AuthShell
      title="Crear tu cuenta"
      subtitle="Activá tu espacio y empezá a organizar proyectos con claridad."
      asideLink={{
        href: buildAuthHref("/login", redirectTo, email),
        label: "Ya tengo cuenta",
      }}
      footer={
        <>
          Las invitaciones pendientes por email se vinculan automáticamente
          cuando terminás el registro.
        </>
      }
    >
      <RegisterForm
        initialEmail={email}
        loginHref={buildAuthHref("/login", redirectTo, email)}
        redirectTo={redirectTo}
      />
    </AuthShell>
  );
}
