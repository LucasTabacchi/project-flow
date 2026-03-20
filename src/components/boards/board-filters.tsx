"use client";

import { memo, useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useBoardStore } from "@/stores/board-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_PRIORITIES, CARD_STATUSES } from "@/lib/constants";
import { getPriorityLabel, getStatusLabel } from "@/lib/utils";
import type { BoardMemberView, LabelView } from "@/types";

type BoardFiltersProps = {
  boardId: string;
  labels: LabelView[];
  members: BoardMemberView[];
};

type SavedFilter = {
  id: string;
  name: string;
  query: string;
  labelId: string;
  assigneeId: string;
  priority: string;
  status: string;
  overdueOnly: boolean;
};

function getSavedFiltersKey(boardId: string) {
  return `projectflow_saved_filters_${boardId}`;
}

function loadSavedFilters(boardId: string): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getSavedFiltersKey(boardId));
    return raw ? (JSON.parse(raw) as SavedFilter[]) : [];
  } catch {
    return [];
  }
}

function persistSavedFilters(boardId: string, filters: SavedFilter[]) {
  try {
    localStorage.setItem(getSavedFiltersKey(boardId), JSON.stringify(filters));
  } catch {
    // localStorage no disponible
  }
}

function BoardFiltersComponent({ boardId, labels, members }: BoardFiltersProps) {
  const filters = useBoardStore((state) => state.filters);
  const setFilters = useBoardStore((state) => state.setFilters);

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    setSavedFilters(loadSavedFilters(boardId));
  }, [boardId]);

  const hasActiveFilters =
    filters.query !== "" ||
    filters.labelId !== "ALL" ||
    filters.assigneeId !== "ALL" ||
    filters.priority !== "ALL" ||
    filters.status !== "ALL" ||
    filters.overdueOnly;

  function handleSaveFilter() {
    if (!saveName.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveName.trim(),
      ...filters,
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    persistSavedFilters(boardId, updated);
    setSaveName("");
    setShowSaveInput(false);
    toast.success("Filtro guardado.");
  }

  function handleApplyFilter(saved: SavedFilter) {
    setFilters({
      query: saved.query,
      labelId: saved.labelId,
      assigneeId: saved.assigneeId,
      priority: saved.priority as typeof filters.priority,
      status: saved.status as typeof filters.status,
      overdueOnly: saved.overdueOnly,
    });
  }

  function handleDeleteFilter(id: string) {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    persistSavedFilters(boardId, updated);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">

          {/* Búsqueda */}
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Búsqueda</p>
            <Input
              value={filters.query}
              onChange={(e) => setFilters({ query: e.target.value })}
              placeholder="Título o descripción"
            />
          </div>

          {/* Etiqueta */}
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Etiqueta</p>
            <Select value={filters.labelId} onValueChange={(v) => setFilters({ labelId: v })}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las etiquetas</SelectItem>
                {labels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Responsable */}
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Responsable</p>
            <Select value={filters.assigneeId} onValueChange={(v) => setFilters({ assigneeId: v })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {members.map((m) => <SelectItem key={m.userId} value={m.userId}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridad */}
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prioridad</p>
            <Select value={filters.priority} onValueChange={(v) => setFilters({ priority: v as typeof filters.priority })}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {CARD_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{getPriorityLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Estado</p>
            <Select value={filters.status} onValueChange={(v) => setFilters({ status: v as typeof filters.status })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {CARD_STATUSES.map((s) => <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Solo vencidas */}
          <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vencimiento</p>
            <Button
              type="button"
              variant={filters.overdueOnly ? "default" : "secondary"}
              className="w-full justify-center"
              onClick={() => setFilters({ overdueOnly: !filters.overdueOnly })}
            >
              {filters.overdueOnly ? "✓ Solo vencidas" : "Solo vencidas"}
            </Button>
          </div>
        </div>

        {/* Guardar filtro actual */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
            {showSaveInput ? (
              <>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Nombre del filtro..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveFilter(); if (e.key === "Escape") setShowSaveInput(false); }}
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveFilter} disabled={!saveName.trim()}>
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveInput(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowSaveInput(true)}
              >
                <Bookmark className="size-3.5" />
                Guardar estos filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filtros guardados */}
      {savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Guardados:</span>
          {savedFilters.map((saved) => (
            <div key={saved.id} className="flex items-center gap-0.5 rounded-xl border border-border bg-card/70 pl-2.5 pr-1 py-1">
              <button
                type="button"
                onClick={() => handleApplyFilter(saved)}
                className="flex items-center gap-1.5 text-xs font-medium hover:text-primary transition-colors"
              >
                <BookmarkCheck className="size-3 text-primary" />
                {saved.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFilter(saved.id)}
                className="ml-1 flex size-4 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const BoardFilters = memo(BoardFiltersComponent);
