"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  LayoutList,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_PRIORITIES, CARD_STATUSES, LABEL_COLOR_STYLES } from "@/lib/constants";
import { cn, getPriorityLabel, getStatusLabel, isCardOverdue } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import { UserAvatar } from "@/components/ui/avatar";
import type { CardSummaryView } from "@/types";

type SortField = "title" | "status" | "priority" | "dueDate" | "updatedAt";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
const STATUS_ORDER = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  DONE: 3,
  BLOCKED: 4,
} as const;

type TableViewProps = {
  onOpenCard: (cardId: string) => void;
};

export function TableView({ onOpenCard }: TableViewProps) {
  const board = useBoardStore((s) => s.board);

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterList, setFilterList] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const allCards = useMemo(() => {
    if (!board) return [];
    return board.lists.flatMap((list) =>
      list.cards.map((card) => ({ ...card, listName: list.name })),
    );
  }, [board]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCards.filter((card) => {
      const matchesQuery =
        !q ||
        card.title.toLowerCase().includes(q) ||
        (card.description ?? "").toLowerCase().includes(q);
      const matchesStatus =
        filterStatus === "ALL" || card.status === filterStatus;
      const matchesPriority =
        filterPriority === "ALL" || card.priority === filterPriority;
      const matchesList =
        filterList === "ALL" || card.listId === filterList;
      return matchesQuery && matchesStatus && matchesPriority && matchesList;
    });
  }, [allCards, query, filterStatus, filterPriority, filterList]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title, "es");
      } else if (sortField === "status") {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      } else if (sortField === "priority") {
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      } else if (sortField === "dueDate") {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = ad - bd;
      } else if (sortField === "updatedAt") {
        cmp =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ArrowUpDown className="size-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? (
      <ChevronUp className="size-3 text-primary" />
    ) : (
      <ChevronDown className="size-3 text-primary" />
    );
  }

  if (!board) return null;

  const lists = board.lists;

  return (
    <div className="rounded-[28px] border border-border bg-card/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
        <LayoutList className="size-4 text-primary shrink-0" />
        <h3 className="font-semibold">Vista tabla</h3>
        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {sorted.length}
        </span>
      </div>

      {/* Filters */}
      <div className="grid gap-2 border-b border-border/60 px-5 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Buscar tarjeta…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />
        <Select value={filterList} onValueChange={setFilterList}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Lista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las listas</SelectItem>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {CARD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las prioridades</SelectItem>
            {CARD_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {getPriorityLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-5 py-3 w-[35%]">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("title")}
                >
                  Tarjeta <SortIcon field="title" />
                </button>
              </th>
              <th className="px-3 py-3">Lista</th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("status")}
                >
                  Estado <SortIcon field="status" />
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("priority")}
                >
                  Prioridad <SortIcon field="priority" />
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("dueDate")}
                >
                  Fecha límite <SortIcon field="dueDate" />
                </button>
              </th>
              <th className="px-3 py-3">Responsables</th>
              <th className="px-3 py-3">Etiquetas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  No hay tarjetas que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              sorted.map((card) => (
                <TableRow
                  key={card.id}
                  card={card}
                  listName={(card as CardSummaryView & { listName: string }).listName}
                  onOpenCard={onOpenCard}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Fila individual ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  TODO: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  IN_PROGRESS: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  IN_REVIEW: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  DONE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  BLOCKED: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  MEDIUM: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  HIGH: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

function TableRow({
  card,
  listName,
  onOpenCard,
}: {
  card: CardSummaryView;
  listName: string;
  onOpenCard: (id: string) => void;
}) {
  const overdue = isCardOverdue(card.dueDate, card.status);

  return (
    <tr
      className="group cursor-pointer transition-colors hover:bg-secondary/40"
      onClick={() => onOpenCard(card.id)}
    >
      {/* Título */}
      <td className="px-5 py-3">
        <p className="font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {card.title}
        </p>
        {card.checklistTotal > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            ✓ {card.checklistCompleted}/{card.checklistTotal}
          </p>
        )}
      </td>

      {/* Lista */}
      <td className="px-3 py-3">
        <span className="rounded-lg bg-secondary px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">
          {listName}
        </span>
      </td>

      {/* Estado */}
      <td className="px-3 py-3">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            STATUS_STYLES[card.status],
          )}
        >
          {getStatusLabel(card.status)}
        </span>
      </td>

      {/* Prioridad */}
      <td className="px-3 py-3">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            PRIORITY_STYLES[card.priority],
          )}
        >
          {getPriorityLabel(card.priority)}
        </span>
      </td>

      {/* Fecha */}
      <td className="px-3 py-3 whitespace-nowrap">
        {card.dueDate ? (
          <span
            className={cn(
              "text-xs font-medium",
              overdue
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground",
            )}
          >
            {overdue && "⚠ "}
            {format(new Date(card.dueDate), "dd MMM yyyy", { locale: es })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Responsables */}
      <td className="px-3 py-3">
        {card.assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {card.assignees.slice(0, 3).map((a) => (
              <UserAvatar
                key={a.userId}
                name={a.name}
                src={a.avatarUrl}
                className="size-6 ring-2 ring-background"
                title={a.name}
              />
            ))}
            {card.assignees.length > 3 && (
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold ring-2 ring-background">
                +{card.assignees.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Etiquetas */}
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {card.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                LABEL_COLOR_STYLES[label.color].soft,
              )}
            >
              {label.name}
            </span>
          ))}
          {card.labels.length > 2 && (
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{card.labels.length - 2}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
