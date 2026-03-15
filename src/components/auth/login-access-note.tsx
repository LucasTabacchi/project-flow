import { ShieldCheck } from "lucide-react";

export function LoginAccessNote() {
  return (
    <div className="rounded-[24px] border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <ShieldCheck className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">Acceso a tu espacio de trabajo</p>
          <p>
            Ingresá con el email de tu cuenta o con la dirección donde
            recibiste una invitación del equipo.
          </p>
        </div>
      </div>
    </div>
  );
}
