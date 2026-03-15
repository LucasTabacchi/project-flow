import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = {
  title: "Iniciar sesión | ProjectFlow",
  description:
    "Ingresá a ProjectFlow para acceder a tus tableros, tareas y colaboración del equipo.",
};

export default function LoginPage() {
  return <LoginScreen />;
}
