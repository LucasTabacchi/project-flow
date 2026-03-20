"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LABEL_COLOR_STYLES } from "@/lib/constants";
import { cn, isCardOverdue } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";

type CalendarViewProps = {
  onOpenCard: (cardId: string) => void;
};

export function CalendarView({ onOpenCard }: CalendarViewProps) {
  const board = useBoardStore((s) => s.board);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const allCards = useMemo(() => {
    if (!board) return [];
    return board.lists.flatMap((list) =>
      list.cards
        .filter((card) => card.dueDate)
        .map((card) => ({ ...card, listName: list.name })),
    );
  }, [board]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // lunes
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  function getCardsForDay(day: Date) {
    return allCards.filter(
      (card) => card.dueDate && isSameDay(new Date(card.dueDate), day),
    );
  }

  if (!board) return null;

  return (
    <div className="rounded-[28px] border border-border bg-card/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <h3 className="font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-3">
        {/* Días de la semana */}
        <div className="mb-1 grid grid-cols-7">
          {weekDays.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-px rounded-2xl overflow-hidden bg-border/30">
          {days.map((day) => {
            const dayCards = getCardsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[80px] bg-card/90 p-1.5 sm:min-h-[100px]",
                  !isCurrentMonth && "bg-secondary/20",
                )}
              >
                {/* Número del día */}
                <div className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isCurrentDay && "bg-primary text-primary-foreground font-bold",
                  !isCurrentDay && !isCurrentMonth && "text-muted-foreground/40",
                  !isCurrentDay && isCurrentMonth && "text-foreground",
                )}>
                  {format(day, "d")}
                </div>

                {/* Tarjetas del día */}
                <div className="space-y-0.5">
                  {dayCards.slice(0, 3).map((card) => {
                    const overdue = isCardOverdue(card.dueDate, card.status);
                    const firstLabel = card.labels[0];
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => onOpenCard(card.id)}
                        className={cn(
                          "w-full truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium transition hover:opacity-80",
                          overdue
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : firstLabel
                              ? LABEL_COLOR_STYLES[firstLabel.color].soft
                              : "bg-primary/10 text-primary",
                        )}
                        title={card.title}
                      >
                        {card.title}
                      </button>
                    );
                  })}
                  {dayCards.length > 3 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{dayCards.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      {allCards.length === 0 && (
        <div className="px-5 pb-6 text-center">
          <p className="text-sm text-muted-foreground">
            No hay tarjetas con fecha límite en este tablero.
          </p>
        </div>
      )}
    </div>
  );
}
