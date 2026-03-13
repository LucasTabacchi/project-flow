"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_PRIORITIES, CARD_STATUSES, LABEL_COLOR_STYLES } from "@/lib/constants";
import {
  formatDueDate,
  getBoardTheme,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/utils";
import type { SearchCardView, UserSummary } from "@/types";

type SearchViewProps = {
  results: SearchCardView[];
  context: {
    boards: Array<{
      id: string;
      name: string;
      theme: string;
    }>;
    members: UserSummary[];
    labels: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
  initialFilters: {
    q: string;
    boardId: string;
    assigneeId: string;
    labelId: string;
    priority: string;
    status: string;
    overdue: string;
  };
};

export function SearchView({
  results,
  context,
  initialFilters,
}: SearchViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialFilters.q);
  const deferredQuery = useDeferredValue(query);

  const selectedFilters = useMemo(
    () => ({
      boardId: initialFilters.boardId,
      assigneeId: initialFilters.assigneeId,
      labelId: initialFilters.labelId,
      priority: initialFilters.priority,
      status: initialFilters.status,
      overdue: initialFilters.overdue,
    }),
    [
      initialFilters.assigneeId,
      initialFilters.boardId,
      initialFilters.labelId,
      initialFilters.overdue,
      initialFilters.priority,
      initialFilters.status,
    ],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (deferredQuery) {
      params.set("q", deferredQuery);
    } else {
      params.delete("q");
    }

    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
  }, [deferredQuery, pathname, router, searchParams]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL" || value === "false") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buscar tarjetas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Encontrá trabajo por texto, etiquetas, prioridad, responsable o tablero.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[2fr_repeat(5,minmax(0,1fr))]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, descripción o nombre del tablero"
          />

          <Select
            value={selectedFilters.boardId || "ALL"}
            onValueChange={(value) => updateFilter("boardId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tablero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tableros</SelectItem>
              {context.boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedFilters.assigneeId || "ALL"}
            onValueChange={(value) => updateFilter("assigneeId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {context.members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedFilters.labelId || "ALL"}
            onValueChange={(value) => updateFilter("labelId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {context.labels.map((label) => (
                <SelectItem key={label.id} value={label.id}>
                  {label.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedFilters.priority || "ALL"}
            onValueChange={(value) => updateFilter("priority", value)}
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
            value={selectedFilters.status || "ALL"}
            onValueChange={(value) => updateFilter("status", value)}
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          variant={selectedFilters.overdue === "true" ? "default" : "secondary"}
          onClick={() =>
            updateFilter("overdue", selectedFilters.overdue === "true" ? "false" : "true")
          }
        >
          Solo vencidas
        </Button>
      </div>

      {results.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {results.map((card) => {
            const theme = getBoardTheme(card.boardTheme);

            return (
              <Link key={card.id} href={`/boards/${card.boardId}`}>
                <Card className="h-full transition hover:-translate-y-0.5">
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={theme.chipClass}>{card.boardName}</Badge>
                      <Badge variant="secondary">{getStatusLabel(card.status)}</Badge>
                      <Badge variant="outline">{getPriorityLabel(card.priority)}</Badge>
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-semibold">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {card.description || "Sin descripción"} · {card.listName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {card.labels.map((label) => (
                        <Badge
                          key={label.id}
                          className={LABEL_COLOR_STYLES[label.color].soft}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Vence {formatDueDate(card.dueDate)}
                      </span>
                      <span
                        className={
                          card.isOverdue
                            ? "font-semibold text-amber-600 dark:text-amber-300"
                            : "text-muted-foreground"
                        }
                      >
                        {card.isOverdue ? "Vencida" : "En término"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No encontramos resultados"
          description="Ajustá texto o filtros hasta encontrar la tarjeta que buscás."
        />
      )}
    </div>
  );
}
