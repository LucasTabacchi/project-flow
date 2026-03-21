"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createRecurringCardAction,
  deleteRecurringCardAction,
  listRecurringCardsAction,
  updateRecurringCardAction,
} from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CARD_PRIORITIES } from "@/lib/constants";
import { cn, getPriorityLabel } from "@/lib/utils";
import type { RecurringCardView } from "@/types/action-contracts";
import type { BoardListView } from "@/types";

const FREQUENCY_LABELS = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
} as const;

type RecurringPanelProps = {
  boardId: string;
  lists: BoardListView[];
  canEdit: boolean;
};

export function RecurringCardsPanel({ boardId, lists, canEdit }: RecurringPanelProps) {
  const [recurring, setRecurring] = useState<RecurringCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fPriority, setFPriority] = useState("MEDIUM");
  const [fFrequency, setFFrequency] = useState("WEEKLY");
  const [fListId, setFListId] = useState(lists[0]?.id ?? "");
  const [fFirstDue, setFFirstDue] = useState("");
  const [fLeadDays, setFLeadDays] = useState("0");

  async function loadRecurring() {
    const result = await listRecurringCardsAction(boardId);
    setLoading(false);
    if (result.ok && result.data) setRecurring(result.data.recurring);
  }

  useEffect(() => { void loadRecurring(); }, [boardId]);

  function handleCreate() {
    startTransition(async () => {
      const result = await createRecurringCardAction({
        boardId,
        listId: fListId,
        title: fTitle,
        description: fDescription || undefined,
        priority: fPriority,
        frequency: fFrequency,
        firstDueAt: fFirstDue,
        leadDays: parseInt(fLeadDays, 10) || 0,
      });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message ?? "Tarjeta recurrente creada.");
      setShowForm(false);
      setFTitle(""); setFDescription(""); setFPriority("MEDIUM");
      setFFrequency("WEEKLY"); setFFirstDue(""); setFLeadDays("0");
      await loadRecurring();
    });
  }

  function handleDelete(recurringId: string) {
    startTransition(async () => {
      const result = await deleteRecurringCardAction({ boardId, recurringId });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success("Tarjeta recurrente eliminada.");
      setRecurring((prev) => prev.filter((r) => r.id !== recurringId));
    });
  }

  function handleToggleActive(r: RecurringCardView) {
    startTransition(async () => {
      const result = await updateRecurringCardAction({
        boardId,
        recurringId: r.id,
        title: r.title,
        description: r.description ?? undefined,
        priority: r.priority,
        frequency: r.frequency,
        leadDays: r.leadDays,
        active: !r.active,
      });
      if (!result.ok) { toast.error(result.message); return; }
      setRecurring((prev) =>
        prev.map((item) => (item.id === r.id ? { ...item, active: !item.active } : item)),
      );
    });
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
          <RefreshCw className="size-4 text-primary" />
          <h3 className="font-semibold">Tarjetas recurrentes</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {recurring.length}
          </span>
        </div>
        {canEdit && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-3.5" />
            Nueva
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && canEdit && (
        <div className="rounded-[20px] border border-border bg-background/60 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Título</Label>
              <Input
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder="Ej: Revisión semanal del equipo"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
                placeholder="Descripción de la tarea recurrente…"
                className="min-h-16"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lista de destino</Label>
              <Select value={fListId} onValueChange={setFListId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={fPriority} onValueChange={setFPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARD_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{getPriorityLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frecuencia</Label>
              <Select value={fFrequency} onValueChange={setFFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Primera fecha límite</Label>
              <Input
                type="date"
                value={fFirstDue}
                onChange={(e) => setFFirstDue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Días de antelación para crear</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={fLeadDays}
                onChange={(e) => setFLeadDays(e.target.value)}
                placeholder="0 = el mismo día"
              />
              <p className="text-[10px] text-muted-foreground">
                Cuántos días antes de la fecha límite crear la tarjeta.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isPending || !fTitle.trim() || !fFirstDue || !fListId}
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

      {/* List */}
      {recurring.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No hay tarjetas recurrentes. Las tarjetas recurrentes se crean automáticamente
          según su frecuencia.
        </p>
      ) : (
        <div className="space-y-2">
          {recurring.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-[20px] border border-border bg-card/70 px-4 py-3"
            >
              <div
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  r.active ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {FREQUENCY_LABELS[r.frequency as keyof typeof FREQUENCY_LABELS]} ·{" "}
                  {r.listName} · Próxima:{" "}
                  {format(new Date(r.nextDueAt), "dd MMM yyyy", { locale: es })}
                  {r.leadDays > 0 && ` (crea ${r.leadDays}d antes)`}
                </p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => handleToggleActive(r)}
                    disabled={isPending}
                  >
                    {r.active ? "Pausar" : "Activar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(r.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
