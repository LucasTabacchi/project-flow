import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LABEL_COLOR_STYLES } from "@/lib/constants";
import {
  formatDueDate,
  getBoardTheme,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/utils";
import type { SearchCardView } from "@/types";

type SearchResultsProps = {
  results: SearchCardView[];
};

export function SearchResults({ results }: SearchResultsProps) {
  if (!results.length) {
    return (
      <EmptyState
        title="No encontramos resultados"
        description="Ajustá texto o filtros hasta encontrar la tarjeta que buscás."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {results.map((card) => {
        const theme = getBoardTheme(card.boardTheme);

        return (
          <Link key={card.id} href={`/boards/${card.boardId}`} prefetch={false}>
            <Card className="h-full transition hover:-translate-y-0.5">
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={theme.chipClass}>{card.boardName}</Badge>
                  <Badge variant="secondary">{getStatusLabel(card.status)}</Badge>
                  <Badge variant="outline">{getPriorityLabel(card.priority)}</Badge>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold">{card.title}</h3>
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
  );
}
