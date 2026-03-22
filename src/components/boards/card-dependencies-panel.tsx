"use client";

import { useMemo, useState, useTransition } from "react";
import { GitBranch, Link2, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";

import {
  createCardDependencyAction,
  deleteCardDependencyAction,
} from "@/app/actions/card-dependencies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPriorityLabel, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import type { CardDetailView } from "@/types";

const EMPTY_DEPENDENCY_VALUE = "__none__";

type DependencyCandidate = {
  cardId: string;
  listId: string;
  listName: string;
  title: string;
  dueDate: string | null;
  status: CardDetailView["status"];
  priority: CardDetailView["priority"];
};

type CardDependenciesPanelProps = {
  boardId: string;
  detail: CardDetailView;
  canEdit: boolean;
  onDetailUpdate: (detail: CardDetailView, boardUpdatedAt: string) => void;
  className?: string;
};

type DependencyListItemProps = {
  item: CardDetailView["blocking"][number];
  canEdit: boolean;
  onRemove: (dependencyId: string) => void;
};

function DependencyListItem({
  item,
  canEdit,
  onRemove,
}: DependencyListItemProps) {
  const isResolved = item.status === "DONE";

  return (
    <div className="rounded-2xl border border-border bg-background/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.listName}
            {item.dueDate ? ` · vence ${new Date(item.dueDate).toLocaleDateString("es-AR")}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {getStatusLabel(item.status)}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {getPriorityLabel(item.priority)}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-[10px] ${
                isResolved
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isResolved ? "Resuelta" : "Pendiente"}
            </Badge>
          </div>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => onRemove(item.dependencyId)}
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Eliminar dependencia con ${item.title}`}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CardDependenciesPanel({
  boardId,
  detail,
  canEdit,
  onDetailUpdate,
  className,
}: CardDependenciesPanelProps) {
  const board = useBoardStore((state) => state.board);
  const [isPending, startTransition] = useTransition();
  const [selectedBlockerId, setSelectedBlockerId] = useState(EMPTY_DEPENDENCY_VALUE);
  const [selectedBlockedCardId, setSelectedBlockedCardId] = useState(EMPTY_DEPENDENCY_VALUE);

  const allCandidates = useMemo<DependencyCandidate[]>(() => {
    return (board?.lists ?? []).flatMap((list) =>
      list.cards.map((card) => ({
        cardId: card.id,
        listId: list.id,
        listName: list.name,
        title: card.title,
        dueDate: card.dueDate,
        status: card.status,
        priority: card.priority,
      })),
    );
  }, [board]);

  const blockedByIds = useMemo(
    () => new Set(detail.blockedBy.map((item) => item.cardId)),
    [detail.blockedBy],
  );
  const blockingIds = useMemo(
    () => new Set(detail.blocking.map((item) => item.cardId)),
    [detail.blocking],
  );

  const blockerCandidates = useMemo(
    () =>
      allCandidates.filter(
        (candidate) =>
          candidate.cardId !== detail.id && !blockedByIds.has(candidate.cardId),
      ),
    [allCandidates, blockedByIds, detail.id],
  );

  const blockedCardCandidates = useMemo(
    () =>
      allCandidates.filter(
        (candidate) =>
          candidate.cardId !== detail.id && !blockingIds.has(candidate.cardId),
      ),
    [allCandidates, blockingIds, detail.id],
  );

  const pendingBlockers = useMemo(
    () => detail.blockedBy.filter((item) => item.status !== "DONE"),
    [detail.blockedBy],
  );

  function handleAddDependency(blockerCardId: string, blockedCardId: string) {
    startTransition(async () => {
      const result = await createCardDependencyAction({
        boardId,
        focusCardId: detail.id,
        blockerCardId,
        blockedCardId,
      });

      if (!result.ok || !result.data) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Dependencia agregada.");
      onDetailUpdate(result.data.detail, result.data.boardUpdatedAt);

      if (blockedCardId === detail.id) {
        setSelectedBlockerId(EMPTY_DEPENDENCY_VALUE);
      } else {
        setSelectedBlockedCardId(EMPTY_DEPENDENCY_VALUE);
      }
    });
  }

  function handleRemoveDependency(dependencyId: string) {
    startTransition(async () => {
      const result = await deleteCardDependencyAction({
        boardId,
        focusCardId: detail.id,
        dependencyId,
      });

      if (!result.ok || !result.data) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Dependencia eliminada.");
      onDetailUpdate(result.data.detail, result.data.boardUpdatedAt);
    });
  }

  return (
    <div className={cn("rounded-[28px] border border-border bg-background/70 p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
          <GitBranch className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Dependencias</p>
          <p className="text-sm text-muted-foreground">
            Marcá qué tarjeta bloquea a esta y cuáles dependen de ella.
          </p>
        </div>
      </div>

      {pendingBlockers.length ? (
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              Esta tarjeta tiene {pendingBlockers.length} bloqueo
              {pendingBlockers.length > 1 ? "s pendientes" : " pendiente"}.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          No hay bloqueos pendientes sobre esta tarjeta.
        </div>
      )}

      <div className="mt-4 space-y-5">
        <section className="space-y-3">
          <div>
            <Label>Bloqueada por</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Tarjetas que deben resolverse antes de avanzar con esta.
            </p>
          </div>

          {detail.blockedBy.length ? (
            <div className="space-y-2">
              {detail.blockedBy.map((item) => (
                <DependencyListItem
                  key={item.dependencyId}
                  item={item}
                  canEdit={canEdit}
                  onRemove={handleRemoveDependency}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay bloqueos configurados para esta tarjeta.
            </p>
          )}

          {canEdit ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={selectedBlockerId}
                onValueChange={setSelectedBlockerId}
                disabled={isPending || blockerCandidates.length === 0}
              >
                <SelectTrigger className="sm:flex-1">
                  <SelectValue placeholder="Seleccionar tarjeta que bloquea" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_DEPENDENCY_VALUE}>
                    Seleccionar tarjeta
                  </SelectItem>
                  {blockerCandidates.map((candidate) => (
                    <SelectItem key={candidate.cardId} value={candidate.cardId}>
                      [{candidate.listName}] {candidate.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isPending ||
                  selectedBlockerId === EMPTY_DEPENDENCY_VALUE ||
                  blockerCandidates.length === 0
                }
                onClick={() => handleAddDependency(selectedBlockerId, detail.id)}
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
                Agregar bloqueo
              </Button>
            </div>
          ) : null}
        </section>

        <section className="space-y-3 border-t border-border/60 pt-5">
          <div>
            <Label>Bloquea a</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Tarjetas que dependen de que esta se complete.
            </p>
          </div>

          {detail.blocking.length ? (
            <div className="space-y-2">
              {detail.blocking.map((item) => (
                <DependencyListItem
                  key={item.dependencyId}
                  item={item}
                  canEdit={canEdit}
                  onRemove={handleRemoveDependency}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta tarjeta todavía no bloquea a ninguna otra.
            </p>
          )}

          {canEdit ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={selectedBlockedCardId}
                onValueChange={setSelectedBlockedCardId}
                disabled={isPending || blockedCardCandidates.length === 0}
              >
                <SelectTrigger className="sm:flex-1">
                  <SelectValue placeholder="Seleccionar tarjeta bloqueada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_DEPENDENCY_VALUE}>
                    Seleccionar tarjeta
                  </SelectItem>
                  {blockedCardCandidates.map((candidate) => (
                    <SelectItem key={candidate.cardId} value={candidate.cardId}>
                      [{candidate.listName}] {candidate.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isPending ||
                  selectedBlockedCardId === EMPTY_DEPENDENCY_VALUE ||
                  blockedCardCandidates.length === 0
                }
                onClick={() => handleAddDependency(detail.id, selectedBlockedCardId)}
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
                Agregar dependiente
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
