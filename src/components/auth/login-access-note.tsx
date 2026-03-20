import { KeyRound } from "lucide-react";

export function LoginAccessNote() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3.5 text-sm">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
        <KeyRound className="size-3.5" />
      </div>
      <div>
        <p className="font-semibold text-foreground leading-snug">Acceso a tu workspace</p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          Ingresá con el email de tu cuenta o con la dirección donde recibiste una invitación del equipo.
        </p>
      </div>
    </div>
  );
}
