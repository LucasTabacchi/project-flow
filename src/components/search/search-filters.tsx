import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CARD_PRIORITIES, CARD_STATUSES } from "@/lib/constants";
import { getPriorityLabel, getStatusLabel } from "@/lib/utils";
import type { SearchContextData } from "@/types";

type SearchFiltersProps = {
  context: SearchContextData;
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

export function SearchFilters({
  context,
  initialFilters,
}: SearchFiltersProps) {
  const hasAdvancedFilters = Boolean(
    initialFilters.boardId ||
      initialFilters.assigneeId ||
      initialFilters.labelId ||
      initialFilters.priority ||
      initialFilters.status ||
      initialFilters.overdue === "true",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar tarjetas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Encontrá trabajo por texto y abrí filtros avanzados sólo cuando hagan
          falta.
        </p>
      </CardHeader>
      <CardContent>
        <form action="/search" method="get" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input
              name="q"
              defaultValue={initialFilters.q}
              placeholder="Título, descripción o nombre del tablero"
            />
            <Button type="submit" className="w-full lg:w-auto">
              Buscar
            </Button>
            <Link
              href="/search"
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-all duration-200 hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60 lg:w-auto"
            >
              Limpiar filtros
            </Link>
          </div>

          <details
            open={hasAdvancedFilters}
            className="rounded-[28px] border border-border bg-background/72"
          >
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-foreground marker:hidden">
              <span className="inline-flex items-center gap-2">
                Filtros avanzados
                <span className="text-muted-foreground">
                  {hasAdvancedFilters
                    ? "Activos en esta búsqueda"
                    : "Responsable, estado, prioridad o vencimiento"}
                </span>
              </span>
            </summary>

            <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-2 text-sm font-medium text-foreground">
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Tablero
                </span>
                <NativeSelect name="boardId" defaultValue={initialFilters.boardId}>
                  <option value="">Todos los tableros</option>
                  {context.boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="space-y-2 text-sm font-medium text-foreground">
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Responsable
                </span>
                <NativeSelect
                  name="assigneeId"
                  defaultValue={initialFilters.assigneeId}
                >
                  <option value="">Todos</option>
                  {context.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="space-y-2 text-sm font-medium text-foreground">
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Etiqueta
                </span>
                <NativeSelect name="labelId" defaultValue={initialFilters.labelId}>
                  <option value="">Todas</option>
                  {context.labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="space-y-2 text-sm font-medium text-foreground">
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Prioridad
                </span>
                <NativeSelect name="priority" defaultValue={initialFilters.priority}>
                  <option value="">Todas</option>
                  {CARD_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {getPriorityLabel(priority)}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="space-y-2 text-sm font-medium text-foreground">
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Estado
                </span>
                <NativeSelect name="status" defaultValue={initialFilters.status}>
                  <option value="">Todos</option>
                  {CARD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>

            <div className="border-t border-border px-4 py-4">
              <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  name="overdue"
                  value="true"
                  defaultChecked={initialFilters.overdue === "true"}
                  className="size-4 rounded border-border text-primary focus-visible:ring-4 focus-visible:ring-ring/60"
                />
                Mostrar sólo vencidas
              </label>
            </div>
          </details>
        </form>
      </CardContent>
    </Card>
  );
}
