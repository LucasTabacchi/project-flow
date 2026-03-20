"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";

import { LABEL_COLOR_STYLES } from "@/lib/constants";
import { cn, getPriorityLabel, getStatusLabel, isCardOverdue } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import { UserAvatar } from "@/components/ui/avatar";
import type { BoardMemberView, CardSummaryView } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  TODO: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  IN_PROGRESS: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  IN_REVIEW: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  DONE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  BLOCKED: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-rose-500",
};

type WorkloadViewProps = {
  onOpenCard: (cardId: string) => void;
};

export function WorkloadView({ onOpenCard }: WorkloadViewProps) {
  const board = useBoardStore((s) => s.board);

  // Mapa userId → tarjetas asignadas
  const workload = useMemo(() => {
    if (!board) return [];

    const map = new Map<
      string,
      { member: BoardMemberView; cards: (CardSummaryView & { listName: string })[] }
    >();

    // Inicializar todos los miembros (incluidos los que no tienen tarjetas)
    for (const member of board.members) {
      map.set(member.userId, { member, cards: [] });
    }

    // Asignar tarjetas
    for (const list of board.lists) {
      for (const card of list.cards) {
        for (const assignee of card.assignees) {
          const entry = map.get(assignee.userId);
          if (entry) {
            entry.cards.push({ ...card, listName: list.name });
          }
        }
      }
    }

    // Ordenar: más tarjetas activas primero
    return [...map.values()].sort(
      (a, b) =>
        b.cards.filter((c) => c.status !== "DONE").length -
        a.cards.filter((c) => c.status !== "DONE").length,
    );
  }, [board]);

  // Tarjetas sin asignar
  const unassigned = useMemo(() => {
    if (!board) return [];
    return board.lists.flatMap((list) =>
      list.cards
        .filter((c) => c.assignees.length === 0)
        .map((c) => ({ ...c, listName: list.name })),
    );
  }, [board]);

  // Total de tarjetas activas para la barra de progreso relativa
  const maxActive = useMemo(
    () =>
      Math.max(
        1,
        ...workload.map(
          (w) => w.cards.filter((c) => c.status !== "DONE").length,
        ),
      ),
    [workload],
  );

  if (!board) return null;

  return (
    <div className="space-y-4">
      {/* Resumen general */}
      <div className="rounded-[28px] border border-border bg-card/70 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
          <Users className="size-4 text-primary" />
          <h3 className="font-semibold">Carga de trabajo</h3>
          <span className="ml-1 text-xs text-muted-foreground">
            {board.members.length} miembros
          </span>
        </div>

        {/* Barra de carga por miembro */}
        <div className="divide-y divide-border/40">
          {workload.map(({ member, cards }) => {
            const active = cards.filter((c) => c.status !== "DONE").length;
            const done = cards.filter((c) => c.status === "DONE").length;
            const overdue = cards.filter((c) =>
              isCardOverdue(c.dueDate, c.status),
            ).length;
            const pct = Math.round((active / maxActive) * 100);

            return (
              <div key={member.userId} className="flex items-center gap-4 px-5 py-3">
                <UserAvatar
                  name={member.name}
                  src={member.avatarUrl}
                  className="size-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium text-sm">{member.name}</p>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {overdue > 0 && (
                        <span className="font-semibold text-rose-500">
                          {overdue} vencida{overdue > 1 ? "s" : ""}
                        </span>
                      )}
                      <span>
                        {active} activa{active !== 1 ? "s" : ""}
                      </span>
                      {done > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {done} ✓
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Barra */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        overdue > 0
                          ? "bg-rose-500"
                          : pct > 66
                            ? "bg-amber-500"
                            : "bg-primary",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle por miembro */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {workload.map(({ member, cards }) => (
          <MemberCard
            key={member.userId}
            member={member}
            cards={cards}
            onOpenCard={onOpenCard}
          />
        ))}

        {/* Tarjetas sin asignar */}
        {unassigned.length > 0 && (
          <div className="rounded-[28px] border border-dashed border-border bg-card/40 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground text-sm font-bold">
                  ?
                </div>
                <div>
                  <p className="font-semibold text-sm">Sin asignar</p>
                  <p className="text-xs text-muted-foreground">
                    {unassigned.length} tarjeta{unassigned.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
            <ul className="divide-y divide-border/40 max-h-72 overflow-y-auto">
              {unassigned.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  listName={card.listName}
                  onOpenCard={onOpenCard}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de miembro ────────────────────────────────────────────────────────

function MemberCard({
  member,
  cards,
  onOpenCard,
}: {
  member: BoardMemberView;
  cards: (CardSummaryView & { listName: string })[];
  onOpenCard: (id: string) => void;
}) {
  const active = cards.filter((c) => c.status !== "DONE");
  const done = cards.filter((c) => c.status === "DONE");

  return (
    <div className="rounded-[28px] border border-border bg-card/70 overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <UserAvatar
          name={member.name}
          src={member.avatarUrl}
          className="size-9 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-sm">{member.name}</p>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        </div>
        <div className="ml-auto flex shrink-0 gap-1.5 text-xs">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
            {active.length}
          </span>
          {done.length > 0 && (
            <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
              {done.length} ✓
            </span>
          )}
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Sin tarjetas asignadas.
        </p>
      ) : (
        <ul className="divide-y divide-border/40 max-h-72 overflow-y-auto">
          {/* Activas primero */}
          {active.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              listName={card.listName}
              onOpenCard={onOpenCard}
            />
          ))}
          {/* Hechas al final, atenuadas */}
          {done.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              listName={card.listName}
              onOpenCard={onOpenCard}
              dimmed
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Fila de tarjeta dentro del miembro ───────────────────────────────────────

function CardRow({
  card,
  listName,
  onOpenCard,
  dimmed = false,
}: {
  card: CardSummaryView;
  listName: string;
  onOpenCard: (id: string) => void;
  dimmed?: boolean;
}) {
  const overdue = isCardOverdue(card.dueDate, card.status);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenCard(card.id)}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-secondary/40",
          dimmed && "opacity-50",
        )}
      >
        {/* Dot de prioridad */}
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            PRIORITY_DOT[card.priority],
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium">{card.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{listName}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] font-medium",
                STATUS_STYLES[card.status],
              )}
            >
              {getStatusLabel(card.status)}
            </span>
            {overdue && (
              <span className="rounded-full bg-rose-500/12 px-1.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                Vencida
              </span>
            )}
            {card.labels.slice(0, 1).map((label) => (
              <span
                key={label.id}
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-medium",
                  LABEL_COLOR_STYLES[label.color].soft,
                )}
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      </button>
    </li>
  );
}
