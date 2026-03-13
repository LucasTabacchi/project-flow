import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Empezá a organizar proyectos, listas y tarjetas en minutos."
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
