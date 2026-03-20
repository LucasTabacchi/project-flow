"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Copy, Loader2, Plus, Trash2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";

import {
  createWebhookAction,
  deleteWebhookAction,
  listWebhooksAction,
  testWebhookAction,
  updateWebhookAction,
  WEBHOOK_EVENTS,
  type WebhookView,
} from "@/app/actions/webhooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  "card.created": "Tarjeta creada",
  "card.moved": "Tarjeta movida",
  "card.status_changed": "Estado cambiado",
  "card.assigned": "Responsable asignado",
  "comment.added": "Comentario agregado",
  "list.created": "Lista creada",
  "member.joined": "Miembro unido",
};

type WebhookPanelProps = {
  boardId: string;
};

export function WebhookPanel({ boardId }: WebhookPanelProps) {
  const [webhooks, setWebhooks] = useState<WebhookView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // New webhook form
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>(["card.created", "card.status_changed"]);

  async function loadWebhooks() {
    const result = await listWebhooksAction(boardId);
    setLoading(false);
    if (result.ok && result.data) setWebhooks(result.data.webhooks);
  }

  useEffect(() => { void loadWebhooks(); }, [boardId]);

  function handleCreateWebhook() {
    startTransition(async () => {
      const result = await createWebhookAction({ boardId, url: newUrl, events: newEvents });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message ?? "Webhook creado.");
      setNewUrl("");
      setNewEvents(["card.created", "card.status_changed"]);
      setShowForm(false);
      await loadWebhooks();
    });
  }

  function handleDeleteWebhook(webhookId: string) {
    startTransition(async () => {
      const result = await deleteWebhookAction({ boardId, webhookId });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success("Webhook eliminado.");
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
    });
  }

  function handleToggleActive(webhook: WebhookView) {
    startTransition(async () => {
      const result = await updateWebhookAction({
        boardId,
        webhookId: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: !webhook.active,
      });
      if (!result.ok) { toast.error(result.message); return; }
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, active: !w.active } : w)),
      );
    });
  }

  function handleTestWebhook(webhookId: string) {
    startTransition(async () => {
      const result = await testWebhookAction({ boardId, webhookId });
      if (!result.ok) {
        toast.error(result.message);
      } else {
        toast.success(result.message ?? "Ping enviado.");
      }
    });
  }

  function copySecret(secret: string) {
    void navigator.clipboard.writeText(secret);
    toast.success("Secret copiado al portapapeles.");
  }

  function toggleNewEvent(event: string) {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <h3 className="font-semibold">Webhooks</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {webhooks.length}
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" />
          Nuevo webhook
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-[20px] border border-border bg-background/60 p-4 space-y-3">
          <div className="space-y-1.5">
            <Label>URL de destino</Label>
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://tu-servidor.com/webhook"
              type="url"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Eventos</Label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={newEvents.includes(event)}
                    onCheckedChange={() => toggleNewEvent(event)}
                  />
                  <span className="text-muted-foreground">{EVENT_LABELS[event] ?? event}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleCreateWebhook}
              disabled={isPending || !newUrl.trim() || newEvents.length === 0}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Crear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No hay webhooks configurados. Creá uno para recibir eventos del tablero en tiempo real.
        </p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              isPending={isPending}
              onDelete={() => handleDeleteWebhook(webhook.id)}
              onToggleActive={() => handleToggleActive(webhook)}
              onTest={() => handleTestWebhook(webhook.id)}
              onCopySecret={() => copySecret(webhook.secret)}
            />
          ))}
        </div>
      )}

      {/* Docs hint */}
      <p className="text-xs text-muted-foreground">
        Los eventos se firman con HMAC-SHA256 usando el secret. Verificá la firma en{" "}
        <code className="rounded bg-secondary px-1 py-0.5">X-ProjectFlow-Signature</code>.
      </p>
    </div>
  );
}

// ── Single webhook card ───────────────────────────────────────────────────────

function WebhookCard({
  webhook,
  isPending,
  onDelete,
  onToggleActive,
  onTest,
  onCopySecret,
}: {
  webhook: WebhookView;
  isPending: boolean;
  onDelete: () => void;
  onToggleActive: () => void;
  onTest: () => void;
  onCopySecret: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[20px] border border-border bg-card/70 overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            "size-2 shrink-0 rounded-full",
            webhook.active ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
          <p className="truncate text-sm font-medium">{webhook.url}</p>
          <p className="text-xs text-muted-foreground">
            {webhook.events.length} evento{webhook.events.length !== 1 ? "s" : ""}
            {" · "}
            {webhook.active ? "Activo" : "Inactivo"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onTest} disabled={isPending}>
            Ping
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={onToggleActive}
            disabled={isPending}
          >
            {webhook.active ? "Pausar" : "Activar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/60 px-4 py-3 space-y-3">
          {/* Events */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Eventos suscritos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {webhook.events.map((e) => (
                <span
                  key={e}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {EVENT_LABELS[e] ?? e}
                </span>
              ))}
            </div>
          </div>

          {/* Secret */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Secret de firma
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-secondary px-2 py-1 text-[10px] font-mono text-muted-foreground">
                {webhook.secret}
              </code>
              <button
                type="button"
                onClick={onCopySecret}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Recent deliveries */}
          {webhook.recentDeliveries.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Últimas entregas
              </p>
              <div className="space-y-1">
                {webhook.recentDeliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    {d.success ? (
                      <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3 shrink-0 text-rose-500" />
                    )}
                    <span className="font-mono text-muted-foreground">
                      {EVENT_LABELS[d.event] ?? d.event}
                    </span>
                    {d.statusCode && (
                      <span
                        className={cn(
                          "rounded px-1 font-mono",
                          d.success ? "text-emerald-600" : "text-rose-500",
                        )}
                      >
                        HTTP {d.statusCode}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
