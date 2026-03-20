"use client";

import { useMemo, useRef, useState } from "react";
import {
  addDays,
  addWeeks,
  differenceInDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  isWeekend,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, GanttChartSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LABEL_COLOR_STYLES } from "@/lib/constants";
import { cn, isCardOverdue } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";

// Cuántos días mostramos en el viewport
const VISIBLE_DAYS = 28;
// Ancho de la columna de nombre de tarjeta (px)
const ROW_LABEL_W = 200;
// Ancho de cada celda de día (px)
const DAY_W = 36;

type GanttViewProps = {
  onOpenCard: (cardId: string) => void;
};

export function GanttView({ onOpenCard }: GanttViewProps) {
  const board = useBoardStore((s) => s.board);
  const [windowStart, setWindowStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const windowEnd = addDays(windowStart, VISIBLE_DAYS - 1);
  const days = eachDayOfInterval({ start: windowStart, end: windowEnd });

  // Todas las tarjetas que tienen dueDate
  const cards = useMemo(() => {
    if (!board) return [];
    return board.lists
      .flatMap((list) =>
        list.cards
          .filter((c) => c.dueDate)
          .map((c) => ({ ...c, listName: list.name })),
      )
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [board]);

  function prevWindow() {
    setWindowStart((d) => subWeeks(d, 2));
  }

  function nextWindow() {
    setWindowStart((d) => addWeeks(d, 2));
  }

  function goToday() {
    setWindowStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  if (!board) return null;

  const totalW = ROW_LABEL_W + DAY_W * VISIBLE_DAYS;

  return (
    <div className="rounded-[28px] border border-border bg-card/70 overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <GanttChartSquare className="size-4 text-primary" />
          <h3 className="font-semibold">Vista Gantt</h3>
          <span className="text-xs text-muted-foreground">
            {format(windowStart, "dd MMM", { locale: es })} —{" "}
            {format(windowEnd, "dd MMM yyyy", { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={prevWindow}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={nextWindow}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          No hay tarjetas con fecha límite en este tablero.
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto">
          <div style={{ minWidth: totalW }}>
            {/* Cabecera de días */}
            <div className="flex border-b border-border/60">
              {/* Columna de nombre */}
              <div
                style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                className="shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Tarjeta
              </div>
              {/* Días */}
              {days.map((day) => {
                const today = isToday(day);
                const weekend = isWeekend(day);
                return (
                  <div
                    key={day.toISOString()}
                    style={{ width: DAY_W, minWidth: DAY_W }}
                    className={cn(
                      "shrink-0 py-2 text-center text-[10px] font-medium leading-tight",
                      weekend && "bg-secondary/30",
                      today && "bg-primary/10",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-muted-foreground",
                        today && "font-bold text-primary",
                      )}
                    >
                      {format(day, "dd")}
                    </span>
                    <span
                      className={cn(
                        "block text-[9px] uppercase text-muted-foreground/60",
                        today && "text-primary/80",
                      )}
                    >
                      {format(day, "EEE", { locale: es })}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Filas de tarjetas */}
            {cards.map((card) => {
              const due = new Date(card.dueDate!);
              // La barra ocupa 1 día en la columna de vencimiento
              const barOffset = differenceInDays(due, windowStart);
              const overdue = isCardOverdue(card.dueDate, card.status);

              // Barra visible solo si cae dentro del window
              const barVisible = barOffset >= 0 && barOffset < VISIBLE_DAYS;

              const firstLabel = card.labels[0];
              const barColor = overdue
                ? "bg-rose-500"
                : card.status === "DONE"
                  ? "bg-emerald-500"
                  : firstLabel
                    ? labelColorToBg(firstLabel.color)
                    : "bg-primary";

              return (
                <div
                  key={card.id}
                  className="group flex items-center border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  {/* Nombre */}
                  <div
                    style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                    className="shrink-0 cursor-pointer px-4 py-2.5"
                    onClick={() => onOpenCard(card.id)}
                  >
                    <p className="line-clamp-1 text-sm font-medium group-hover:text-primary transition-colors">
                      {card.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{card.listName}</p>
                  </div>

                  {/* Grid de días */}
                  <div className="relative flex" style={{ height: 48 }}>
                    {days.map((day, i) => {
                      const weekend = isWeekend(day);
                      const today = isToday(day);
                      return (
                        <div
                          key={day.toISOString()}
                          style={{ width: DAY_W, minWidth: DAY_W }}
                          className={cn(
                            "shrink-0 border-l border-border/20",
                            weekend && "bg-secondary/20",
                            today && "bg-primary/5",
                          )}
                        />
                      );
                    })}

                    {/* Barra de vencimiento */}
                    {barVisible && (
                      <button
                        type="button"
                        title={`${card.title} — vence ${format(due, "dd MMM yyyy", { locale: es })}`}
                        onClick={() => onOpenCard(card.id)}
                        style={{
                          position: "absolute",
                          left: barOffset * DAY_W + 4,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: DAY_W - 8,
                        }}
                        className={cn(
                          "h-6 rounded-md opacity-90 transition hover:opacity-100 hover:scale-105",
                          barColor,
                        )}
                      />
                    )}

                    {/* Indicador fuera del window */}
                    {!barVisible && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          transform: "translateY(-50%)",
                          [barOffset < 0 ? "left" : "right"]: 4,
                        }}
                        className={cn(
                          "rounded px-1 py-0.5 text-[9px] font-semibold",
                          overdue
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {barOffset < 0 ? "←" : "→"}{" "}
                        {format(due, "dd MMM", { locale: es })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 border-t border-border/60 px-5 py-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> Pendiente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" /> Hecha
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500" /> Vencida
        </span>
        <span className="ml-auto">
          Hacé clic en una barra o nombre para abrir la tarjeta
        </span>
      </div>
    </div>
  );
}

// Mapear LabelColor a clase bg de Tailwind
function labelColorToBg(color: string): string {
  const map: Record<string, string> = {
    SLATE: "bg-slate-500",
    SKY: "bg-sky-500",
    EMERALD: "bg-emerald-500",
    AMBER: "bg-amber-500",
    ROSE: "bg-rose-500",
    VIOLET: "bg-violet-500",
  };
  return map[color] ?? "bg-primary";
}
