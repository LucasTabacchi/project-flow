"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { getBoardTheme, getPriorityLabel } from "@/lib/utils";
import type { SearchCardView } from "@/types";

type CalendarViewProps = {
  cards: SearchCardView[];
};

export function CalendarView({ cards }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, SearchCardView[]>();

    cards.forEach((card) => {
      if (!card.dueDate) {
        return;
      }

      const key = card.dueDate.slice(0, 10);
      const current = map.get(key) ?? [];
      current.push(card);
      map.set(key, current);
    });

    return map;
  }, [cards]);

  const selectedKey = selectedDate?.toISOString().slice(0, 10);
  const selectedCards = selectedKey ? eventsByDate.get(selectedKey) ?? [] : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Calendario de vencimientos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Elegí un día y revisá qué tarjetas vencen ahí.
          </p>
        </CardHeader>
        <CardContent>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              hasEvents: Array.from(eventsByDate.keys()).map((value) => new Date(value)),
            }}
            modifiersClassNames={{
              hasEvents: "bg-primary/15 text-primary font-semibold",
            }}
            classNames={{
              months: "flex flex-col gap-4",
              month: "space-y-4",
              caption: "flex items-center justify-between",
              caption_label: "font-display text-lg font-semibold",
              nav: "flex items-center gap-2",
              nav_button:
                "flex size-9 items-center justify-center rounded-2xl border border-border bg-card/80",
              table: "w-full border-collapse",
              head_row: "grid grid-cols-7 gap-2",
              row: "mt-2 grid grid-cols-7 gap-2",
              head_cell:
                "text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground",
              cell: "text-center",
              day: "flex h-11 w-full items-center justify-center rounded-2xl transition hover:bg-secondary",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day_today: "border border-primary/40",
              outside: "text-muted-foreground/40",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas del día</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vista rápida de todas las tarjetas con fecha elegida.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCards.length ? (
            selectedCards.map((card) => {
              const theme = getBoardTheme(card.boardTheme);

              return (
                <Link
                  key={card.id}
                  href={`/boards/${card.boardId}`}
                  className="block rounded-[24px] border border-border bg-background/70 p-4 transition hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={theme.chipClass}>{card.boardName}</Badge>
                    <Badge variant="secondary">{card.listName}</Badge>
                    <Badge variant="outline">{getPriorityLabel(card.priority)}</Badge>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {card.description || "Sin descripción"}
                  </p>
                </Link>
              );
            })
          ) : (
            <EmptyState
              title="Sin vencimientos ese día"
              description="Elegí otra fecha o agregá más tarjetas con deadline."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
