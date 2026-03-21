"use client";

import { useEffect, useState, useTransition } from "react";
import { Bot, Loader2, Mail, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  createBoardAutomationRuleAction,
  deleteBoardAutomationRuleAction,
  listBoardAutomationRulesAction,
  toggleBoardAutomationRuleAction,
} from "@/app/actions/automations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CARD_STATUSES } from "@/lib/constants";
import { getStatusLabel } from "@/lib/utils";
import type { BoardMemberView, BoardListView, CardStatus } from "@/types";
import type { BoardAutomationRuleView } from "@/types/action-contracts";

const NONE_VALUE = "__none__";

function parseRecipients(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

type BoardAutomationsPanelProps = {
  boardId: string;
  lists: BoardListView[];
  members: BoardMemberView[];
};

export function BoardAutomationsPanel({
  boardId,
  lists,
  members,
}: BoardAutomationsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [rules, setRules] = useState<BoardAutomationRuleView[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [triggerStatus, setTriggerStatus] = useState<CardStatus>("DONE");
  const [moveToListId, setMoveToListId] = useState(NONE_VALUE);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueInDays, setDueInDays] = useState("");
  const [emailRecipients, setEmailRecipients] = useState("");

  async function loadRules() {
    const result = await listBoardAutomationRulesAction(boardId);
    setLoading(false);

    if (!result.ok || !result.data) {
      toast.error(result.message);
      return;
    }

    setRules(result.data.rules);
  }

  useEffect(() => {
    void loadRules();
  }, [boardId]);

  function toggleAssignee(userId: string) {
    setSelectedAssignees((current) =>
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId],
    );
  }

  function resetForm() {
    setName("");
    setTriggerStatus("DONE");
    setMoveToListId(NONE_VALUE);
    setSelectedAssignees([]);
    setDueInDays("");
    setEmailRecipients("");
  }

  function handleCreateRule() {
    startTransition(async () => {
      const result = await createBoardAutomationRuleAction({
        boardId,
        name,
        triggerStatus,
        moveToListId: moveToListId === NONE_VALUE ? null : moveToListId,
        assignUserIds: selectedAssignees,
        dueInDays: dueInDays.trim() === "" ? null : parseInt(dueInDays, 10),
        emailRecipients: parseRecipients(emailRecipients),
        active: true,
      });

      if (!result.ok || !result.data) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Automatización creada.");
      setRules((current) => [...current, result.data!.rule]);
      resetForm();
      setShowForm(false);
    });
  }

  function handleToggleRule(rule: BoardAutomationRuleView) {
    startTransition(async () => {
      const result = await toggleBoardAutomationRuleAction({
        boardId,
        automationRuleId: rule.id,
        active: !rule.active,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Automatización actualizada.");
      setRules((current) =>
        current.map((entry) =>
          entry.id === rule.id ? { ...entry, active: !rule.active } : entry,
        ),
      );
    });
  }

  function handleDeleteRule(ruleId: string) {
    startTransition(async () => {
      const result = await deleteBoardAutomationRuleAction({
        boardId,
        automationRuleId: ruleId,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Automatización eliminada.");
      setRules((current) => current.filter((rule) => rule.id !== ruleId));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAtLeastOneAction =
    moveToListId !== NONE_VALUE ||
    selectedAssignees.length > 0 ||
    dueInDays.trim() !== "" ||
    parseRecipients(emailRecipients).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <div>
            <p className="font-semibold">Reglas del tablero</p>
            <p className="text-sm text-muted-foreground">
              Ejecutan acciones automáticamente cuando una tarjeta cambia de estado.
            </p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((value) => !value)}>
          <Plus className="size-3.5" />
          Nueva regla
        </Button>
      </div>

      {showForm ? (
        <div className="rounded-[24px] border border-border bg-background/60 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre de la regla</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='Ej. Cuando una tarjeta pase a "Hecha", cerrar todo'
              />
            </div>

            <div className="space-y-2">
              <Label>Disparador</Label>
              <Select
                value={triggerStatus}
                onValueChange={(value) => setTriggerStatus(value as CardStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                La regla corre cuando una tarjeta pasa a este estado.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mover a lista</Label>
              <Select value={moveToListId} onValueChange={setMoveToListId}>
                <SelectTrigger>
                  <SelectValue placeholder="No mover" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No mover</SelectItem>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vencimiento automático</Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={dueInDays}
                onChange={(event) => setDueInDays(event.target.value)}
                placeholder="Vacío = no tocar"
              />
              <p className="text-xs text-muted-foreground">
                Cantidad de días desde hoy. `0` significa hoy.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Asignar responsables</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {members.map((member) => (
                  <label
                    key={member.userId}
                    className="flex cursor-pointer items-start gap-2 rounded-2xl border border-border bg-card/70 px-3 py-3 text-sm"
                  >
                    <Checkbox
                      checked={selectedAssignees.includes(member.userId)}
                      onCheckedChange={() => toggleAssignee(member.userId)}
                    />
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Mandar email a</Label>
              <Textarea
                value={emailRecipients}
                onChange={(event) => setEmailRecipients(event.target.value)}
                placeholder="ops@tu-dominio.com, producto@tu-dominio.com"
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                Destinatarios extra para esta regla. Separalos con coma, punto y coma o salto de línea.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Resumen</p>
              <p className="text-xs text-muted-foreground">
                {hasAtLeastOneAction
                  ? "La regla va a correr apenas una tarjeta cambie al estado seleccionado."
                  : "Configurá al menos una acción para poder guardar la regla."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateRule}
                disabled={isPending || !name.trim() || !hasAtLeastOneAction}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Crear regla
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {rules.length ? (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-[24px] border border-border bg-background/60 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{rule.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        rule.active
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {rule.active ? "Activa" : "Pausada"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cuando una tarjeta pasa a <strong>{getStatusLabel(rule.triggerStatus)}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {rule.moveToListName ? (
                      <span className="rounded-full bg-secondary px-2 py-1">
                        Mover a {rule.moveToListName}
                      </span>
                    ) : null}
                    {rule.assignUserIds.length ? (
                      <span className="rounded-full bg-secondary px-2 py-1">
                        <Users className="mr-1 inline size-3" />
                        Asignar {rule.assignUserIds.length}
                      </span>
                    ) : null}
                    {rule.dueInDays != null ? (
                      <span className="rounded-full bg-secondary px-2 py-1">
                        Vence en {rule.dueInDays} día(s)
                      </span>
                    ) : null}
                    {rule.emailRecipients.length ? (
                      <span className="rounded-full bg-secondary px-2 py-1">
                        <Mail className="mr-1 inline size-3" />
                        Email a {rule.emailRecipients.length}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToggleRule(rule)}
                    disabled={isPending}
                  >
                    {rule.active ? "Pausar" : "Activar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[24px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay reglas. Creá una para automatizar movimientos, asignaciones, vencimientos o emails.
        </p>
      )}
    </div>
  );
}
