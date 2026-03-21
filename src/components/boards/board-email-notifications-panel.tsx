"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";

import {
  getBoardEmailNotificationSettingsAction,
  updateBoardEmailNotificationSettingsAction,
} from "@/app/actions/email-notifications";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BOARD_EMAIL_NOTIFICATION_EVENT_LABELS,
  DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS,
} from "@/lib/board-email-events";
import { BOARD_EVENTS } from "@/lib/board-events";
import { cn } from "@/lib/utils";
import type {
  BoardEmailNotificationSettingsView,
  BoardEmailReminderSettingsView,
} from "@/types/action-contracts";

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

function parseReminderThreshold(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.min(60, parsed));
}

export function BoardEmailNotificationsPanel({ boardId }: { boardId: string }) {
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<BoardEmailNotificationSettingsView | null>(null);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [active, setActive] = useState(false);
  const [reminders, setReminders] = useState<BoardEmailReminderSettingsView>({
    ...DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS,
  });

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
    setReminders(nextSettings.reminders);
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

  function updateReminderSetting<Key extends keyof BoardEmailReminderSettingsView>(
    key: Key,
    value: BoardEmailReminderSettingsView[Key],
  ) {
    setReminders((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBoardEmailNotificationSettingsAction({
        boardId,
        recipients: parseRecipients(recipientsInput),
        events: selectedEvents,
        active,
        reminders,
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
      setReminders(nextSettings.reminders);
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
  const hasReminderRules =
    reminders.overdueEnabled ||
    reminders.upcomingEnabled ||
    reminders.inactiveEnabled ||
    reminders.blockedEnabled;
  const isIncompleteWhileEventsActive = active && (!hasRecipients || selectedEvents.length === 0);
  const isIncompleteWhileRemindersActive =
    reminders.active && (!hasRecipients || !hasReminderRules);
  const isOperational =
    (active && hasRecipients && selectedEvents.length > 0) ||
    (reminders.active && hasRecipients && hasReminderRules);

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-border bg-background/60 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2 text-primary">
            <Mail className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Emails del tablero</p>
            <p className="text-sm text-muted-foreground">
              Configurá destinatarios comunes para eventos inmediatos y reglas de recordatorio. Todo se encola y se envía internamente con Brevo.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Destinatarios</Label>
            <Textarea
              value={recipientsInput}
              onChange={(event) => setRecipientsInput(event.target.value)}
              placeholder="ops@tu-dominio.com, lucas@gmail.com"
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">
              Se reutilizan para eventos del tablero y recordatorios. Separalos con coma, punto y coma o salto de línea.
            </p>
          </div>

          <div className="rounded-[24px] border border-border bg-card/70 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <Mail className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Notificaciones por eventos</p>
                <p className="text-sm text-muted-foreground">
                  Envíos inmediatos cuando ocurren acciones puntuales en el tablero.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-3 py-3 text-sm">
                <Checkbox checked={active} onCheckedChange={(checked) => setActive(Boolean(checked))} />
                <div>
                  <p className="font-medium">Activar notificaciones por eventos</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando esté activo, los eventos seleccionados generan jobs internos de envío.
                  </p>
                </div>
              </label>

              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BOARD_EVENTS.map((event) => (
                    <label
                      key={event}
                      className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background/70 px-3 py-3 text-sm"
                    >
                      <Checkbox
                        checked={selectedEvents.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <span>{BOARD_EMAIL_NOTIFICATION_EVENT_LABELS[event]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {isIncompleteWhileEventsActive ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Para activar los emails por eventos necesitás destinatarios y al menos un evento seleccionado.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-card/70 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <BellRing className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Reglas de recordatorio</p>
                <p className="text-sm text-muted-foreground">
                  Envíos automáticos generados por el cron diario para tarjetas vencidas, próximas a vencer, inactivas o bloqueadas.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-3 py-3 text-sm">
                <Checkbox
                  checked={reminders.active}
                  onCheckedChange={(checked) => updateReminderSetting("active", Boolean(checked))}
                />
                <div>
                  <p className="font-medium">Activar reglas de recordatorio</p>
                  <p className="text-xs text-muted-foreground">
                    El cron diario revisa las reglas activas y encola un digest por tablero, tipo y día.
                  </p>
                </div>
              </label>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={reminders.overdueEnabled}
                      onCheckedChange={(checked) =>
                        updateReminderSetting("overdueEnabled", Boolean(checked))
                      }
                    />
                    <div className="space-y-1">
                      <p className="font-medium">Tarjetas vencidas</p>
                      <p className="text-xs text-muted-foreground">
                        Resume tarjetas abiertas con fecha límite ya superada.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={reminders.upcomingEnabled}
                      onCheckedChange={(checked) =>
                        updateReminderSetting("upcomingEnabled", Boolean(checked))
                      }
                    />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="font-medium">Vencimiento próximo</p>
                        <p className="text-xs text-muted-foreground">
                          Incluye tarjetas que vencen dentro de los próximos N días.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={reminders.upcomingDays}
                          onChange={(event) =>
                            updateReminderSetting(
                              "upcomingDays",
                              parseReminderThreshold(
                                event.target.value,
                                DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.upcomingDays,
                              ),
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">días</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={reminders.inactiveEnabled}
                      onCheckedChange={(checked) =>
                        updateReminderSetting("inactiveEnabled", Boolean(checked))
                      }
                    />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="font-medium">Sin actividad</p>
                        <p className="text-xs text-muted-foreground">
                          Detecta tarjetas abiertas sin cambios recientes.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={reminders.inactiveDays}
                          onChange={(event) =>
                            updateReminderSetting(
                              "inactiveDays",
                              parseReminderThreshold(
                                event.target.value,
                                DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.inactiveDays,
                              ),
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">días</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={reminders.blockedEnabled}
                      onCheckedChange={(checked) =>
                        updateReminderSetting("blockedEnabled", Boolean(checked))
                      }
                    />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="font-medium">Bloqueadas hace X días</p>
                        <p className="text-xs text-muted-foreground">
                          Detecta tarjetas en estado bloqueado o con blockers sin resolver.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={reminders.blockedDays}
                          onChange={(event) =>
                            updateReminderSetting(
                              "blockedDays",
                              parseReminderThreshold(
                                event.target.value,
                                DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.blockedDays,
                              ),
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">días</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {isIncompleteWhileRemindersActive ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Para activar los recordatorios necesitás destinatarios y al menos una regla marcada.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Estado actual</p>
              <p className="text-xs text-muted-foreground">
                {isOperational
                  ? `Activo para ${parseRecipients(recipientsInput).length} destinatario(s).`
                  : "Inactivo o incompleto. No se van a encolar emails."}
              </p>
              <p className="text-xs text-muted-foreground">
                Última actualización: {formatTimestamp(settings?.updatedAt ?? null)}
              </p>
            </div>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar configuración
            </Button>
          </div>
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
                    <p className="text-sm font-medium">
                      {BOARD_EMAIL_NOTIFICATION_EVENT_LABELS[
                        job.event as keyof typeof BOARD_EMAIL_NOTIFICATION_EVENT_LABELS
                      ] ?? job.event}
                    </p>
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
