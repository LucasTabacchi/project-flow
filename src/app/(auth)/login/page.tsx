import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar a ProjectFlow"
      subtitle="Accedé a tus tableros, tareas y colaboración del equipo."
      footer={
        <>
          Si querés probar la app rápido, usá el seed demo y entrá con los
          usuarios sugeridos.
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
