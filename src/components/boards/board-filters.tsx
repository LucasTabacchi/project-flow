"use client";

import { memo } from "react";

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
  labels: LabelView[];
  members: BoardMemberView[];
};

function BoardFiltersComponent({ labels, members }: BoardFiltersProps) {
  const filters = useBoardStore((state) => state.filters);
  const setFilters = useBoardStore((state) => state.setFilters);

  return (
    <div className="grid gap-3 rounded-[28px] border border-border bg-card/70 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
      <Input
        value={filters.query}
        onChange={(event) => setFilters({ query: event.target.value })}
        placeholder="Buscar por título o descripción"
      />

      <Select
        value={filters.labelId}
        onValueChange={(value) => setFilters({ labelId: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Etiqueta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las etiquetas</SelectItem>
          {labels.map((label) => (
            <SelectItem key={label.id} value={label.id}>
              {label.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assigneeId}
        onValueChange={(value) => setFilters({ assigneeId: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Responsable" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(value) =>
          setFilters({ priority: value as typeof filters.priority })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas</SelectItem>
          {CARD_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {getPriorityLabel(priority)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          setFilters({ status: value as typeof filters.status })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos</SelectItem>
          {CARD_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {getStatusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={filters.overdueOnly ? "default" : "secondary"}
        className="w-full justify-center sm:col-span-2 xl:col-span-1"
        onClick={() => setFilters({ overdueOnly: !filters.overdueOnly })}
      >
        Solo vencidas
      </Button>
    </div>
  );
}

export const BoardFilters = memo(BoardFiltersComponent);
