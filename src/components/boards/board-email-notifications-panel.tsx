"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";

import {
  getBoardEmailNotificationSettingsAction,
  updateBoardEmailNotificationSettingsAction,
} from "@/app/actions/email-notifications";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WEBHOOK_EVENTS } from "@/lib/webhook-events";
import { cn } from "@/lib/utils";
import type { BoardEmailNotificationSettingsView } from "@/types/action-contracts";

const EVENT_LABELS: Record<string, string> = {
  "card.created": "Tarjeta creada",
  "card.moved": "Tarjeta movida",
  "card.status_changed": "Estado cambiado",
  "card.assigned": "Responsable asignado",
  "comment.added": "Comentario agregado",
  "list.created": "Lista creada",
  "member.joined": "Miembro unido",
};

function parseRecipients(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function BoardEmailNotificationsPanel({ boardId }: { boardId: string }) {
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<BoardEmailNotificationSettingsView | null>(null);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [active, setActive] = useState(false);

  async function loadSettings() {
    const result = await getBoardEmailNotificationSettingsAction(boardId);

    setLoading(false);

    if (!result.ok || !result.data) {
      toast.error(result.message);
      return;
    }

    const nextSettings = result.data.settings;
    setSettings(nextSettings);
    setRecipientsInput(nextSettings.recipients.join(", "));
    setSelectedEvents(nextSettings.events);
    setActive(nextSettings.active);
  }

  useEffect(() => {
    void loadSettings();
  }, [boardId]);

  function toggleEvent(event: string) {
    setSelectedEvents((current) =>
      current.includes(event)
        ? current.filter((item) => item !== event)
        : [...current, event],
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBoardEmailNotificationSettingsAction({
        boardId,
        recipients: parseRecipients(recipientsInput),
        events: selectedEvents,
        active,
      });

      if (!result.ok || !result.data) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Emails del tablero actualizados.");
      const nextSettings = result.data.settings;
      setSettings(nextSettings);
      setRecipientsInput(nextSettings.recipients.join(", "));
      setSelectedEvents(nextSettings.events);
      setActive(nextSettings.active);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasRecipients = parseRecipients(recipientsInput).length > 0;
  const isIncompleteWhileActive = active && (!hasRecipients || selectedEvents.length === 0);

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-border bg-background/60 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2 text-primary">
            <Mail className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Notificaciones por email</p>
            <p className="text-sm text-muted-foreground">
              Configurá destinatarios y eventos. Los cambios se encolan internamente en la base y se envían con Brevo sin pasar por un webhook público.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-3 py-3 text-sm">
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(Boolean(checked))} />
            <div>
              <p className="font-medium">Activar emails del tablero</p>
              <p className="text-xs text-muted-foreground">
                Cuando esté activo, los eventos seleccionados generan jobs internos de envío.
              </p>
            </div>
          </label>

          <div className="space-y-2">
            <Label>Destinatarios</Label>
            <Textarea
              value={recipientsInput}
              onChange={(event) => setRecipientsInput(event.target.value)}
              placeholder="ops@tu-dominio.com, lucas@gmail.com"
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">
              Separalos con coma, punto y coma o salto de línea.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Eventos</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-card/70 px-3 py-3 text-sm"
                >
                  <Checkbox
                    checked={selectedEvents.includes(event)}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <span>{EVENT_LABELS[event] ?? event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Estado actual</p>
              <p className="text-xs text-muted-foreground">
                {active && hasRecipients && selectedEvents.length > 0
                  ? `Activo para ${parseRecipients(recipientsInput).length} destinatario(s).`
                  : "Inactivo o incompleto. No se van a encolar emails."}
              </p>
              <p className="text-xs text-muted-foreground">
                Última actualización: {formatTimestamp(settings?.updatedAt ?? null)}
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar configuración
            </Button>
          </div>
          {isIncompleteWhileActive ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Para activar los emails necesitás al menos un destinatario y un evento seleccionado.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[24px] border border-border bg-background/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Jobs recientes</p>
            <p className="text-sm text-muted-foreground">
              Historial breve de la cola interna de emails para este tablero.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {settings?.recentJobs.length ?? 0}
          </span>
        </div>

        {settings?.recentJobs.length ? (
          <div className="space-y-2">
            {settings.recentJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-card/70 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{EVENT_LABELS[job.event] ?? job.event}</p>
                    <p className="text-xs text-muted-foreground">
                      Creado {formatTimestamp(job.createdAt)} · Intentos {job.attempts}
                    </p>
                    {job.lastError ? (
                      <p className="mt-1 text-xs text-destructive">{job.lastError}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                      job.status === "SENT" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                      job.status === "FAILED" && "bg-destructive/10 text-destructive",
                      job.status === "PROCESSING" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      job.status === "PENDING" && "bg-secondary text-muted-foreground",
                    )}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Todavía no hay jobs encolados para este tablero.
          </p>
        )}
      </div>
    </div>
  );
}
