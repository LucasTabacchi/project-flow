"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { SearchContextData } from "@/types";

type SearchFiltersProps = {
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

const EMPTY_CONTEXT: SearchContextData = {
  boards: [],
  members: [],
  labels: [],
};

function buildSearchHref(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function syncParam(params: URLSearchParams, key: string, value: string) {
  if (!value || value === "ALL" || value === "false") {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

export function SearchFilters({ initialFilters }: SearchFiltersProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialFilters.q);
  const [context, setContext] = useState<SearchContextData>(EMPTY_CONTEXT);
  const [contextStatus, setContextStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  useEffect(() => {
    setQuery(initialFilters.q);
  }, [initialFilters.q]);

  useEffect(() => {
    const controller = new AbortController();

    const loadContext = async () => {
      setContextStatus("loading");

      try {
        const response = await fetch("/api/search/context", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const payload = (await response.json()) as SearchContextData;
        setContext(payload);
        setContextStatus("ready");
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setContext(EMPTY_CONTEXT);
        setContextStatus("error");
      }
    };

    void loadContext();

    return () => controller.abort();
  }, []);

  const filtersDisabled = contextStatus !== "ready";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentParams = new URLSearchParams(searchParams.toString());
      const nextParams = new URLSearchParams(searchParams.toString());

      syncParam(nextParams, "q", query.trim());

      const currentHref = buildSearchHref(pathname, currentParams);
      const nextHref = buildSearchHref(pathname, nextParams);

      if (currentHref === nextHref) {
        return;
      }

      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, query, router, searchParams, startTransition]);

  function updateFilter(key: string, value: string) {
    const currentParams = new URLSearchParams(searchParams.toString());
    const nextParams = new URLSearchParams(searchParams.toString());

    syncParam(nextParams, key, value);

    const currentHref = buildSearchHref(pathname, currentParams);
    const nextHref = buildSearchHref(pathname, nextParams);

    if (currentHref === nextHref) {
      return;
    }

    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Buscar tarjetas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Encontrá trabajo por texto, etiquetas, prioridad, responsable o tablero.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, descripción o nombre del tablero"
          />

          <Select
            disabled={filtersDisabled}
            value={initialFilters.boardId || "ALL"}
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
            disabled={filtersDisabled}
            value={initialFilters.assigneeId || "ALL"}
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
            disabled={filtersDisabled}
            value={initialFilters.labelId || "ALL"}
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
            value={initialFilters.priority || "ALL"}
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
            value={initialFilters.status || "ALL"}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {contextStatus === "loading" ? (
          <span className="text-sm text-muted-foreground">Cargando filtros...</span>
        ) : null}

        {contextStatus === "error" ? (
          <span className="text-sm text-muted-foreground">
            No pudimos cargar los filtros avanzados.
          </span>
        ) : null}

        {isPending ? (
          <span className="text-sm text-muted-foreground">Actualizando resultados...</span>
        ) : null}

        <Button
          type="button"
          variant={initialFilters.overdue === "true" ? "default" : "secondary"}
          className="w-full sm:w-auto"
          onClick={() =>
            updateFilter("overdue", initialFilters.overdue === "true" ? "false" : "true")
          }
        >
          Solo vencidas
        </Button>
      </div>
    </>
  );
}
