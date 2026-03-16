"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfToday,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Clock3,
  Layers3,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cn,
  getBoardTheme,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/utils";
import type { CalendarCardView } from "@/types";

type CalendarViewProps = {
  cards: CalendarCardView[];
};

type CalendarMetricProps = {
  label: string;
  value: string | number;
  hint: string;
  className?: string;
  valueClassName?: string;
};

function toLocalCalendarDate(value: string) {
  const date = parseISO(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toLocalDateKey(value: Date | string) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "yyyy-MM-dd");
}

const CalendarMonthPicker = dynamic(
  () =>
    import("@/components/calendar/calendar-month-picker").then(
      (module) => module.CalendarMonthPicker,
    ),
  {
    loading: () => (
      <div className="h-[360px] animate-pulse rounded-[28px] bg-secondary/60" />
    ),
  },
);

function compareCardDates(left: CalendarCardView, right: CalendarCardView) {
  if (!left.dueDate || !right.dueDate) {
    return 0;
  }

  return parseISO(left.dueDate).getTime() - parseISO(right.dueDate).getTime();
}

function CalendarMetric({
  label,
  value,
  hint,
  className,
  valueClassName,
}: CalendarMetricProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[24px] border border-border bg-background/72 px-4 py-4",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 min-w-0 font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold leading-[0.95] tracking-tight text-balance",
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function AgendaCard({ card }: { card: CalendarCardView }) {
  const theme = getBoardTheme(card.boardTheme);

  return (
    <Link
      href={`/boards/${card.boardId}`}
      prefetch={false}
      className="group block rounded-[26px] border border-border bg-background/72 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={theme.chipClass}>{card.boardName}</Badge>
            <Badge variant="secondary">{card.listName}</Badge>
            <Badge variant="outline">{getPriorityLabel(card.priority)}</Badge>
          </div>

          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight">
              {card.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {card.description || "Sin descripción"}
            </p>
          </div>
        </div>

        <span className="inline-flex rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
          {getStatusLabel(card.status)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock3 className="size-4" />
          <span>
            {card.dueDate
              ? format(parseISO(card.dueDate), "dd 'de' MMMM", { locale: es })
              : "Sin fecha"}
          </span>
        </div>

        <span
          className={
            card.isOverdue
              ? "font-semibold text-amber-700 dark:text-amber-300"
              : "inline-flex items-center gap-1 text-primary"
          }
        >
          {card.isOverdue ? "Vencida" : "Abrir tablero"}
          {!card.isOverdue ? <ArrowRight className="size-4" /> : null}
        </span>
      </div>
    </Link>
  );
}

export function CalendarView({ cards }: CalendarViewProps) {
  const today = useMemo(() => startOfToday(), []);
  const initialSelectedDate = useMemo(() => {
    const nextUpcoming = cards
      .filter((card) => card.dueDate && !card.isOverdue)
      .sort(compareCardDates)[0];

    if (nextUpcoming?.dueDate) {
      return toLocalCalendarDate(nextUpcoming.dueDate);
    }

    const firstDueCard = cards.find((card) => card.dueDate);
    return firstDueCard?.dueDate ? toLocalCalendarDate(firstDueCard.dueDate) : today;
  }, [cards, today]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialSelectedDate);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    startOfMonth(initialSelectedDate),
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarCardView[]>();

    cards.forEach((card) => {
      if (!card.dueDate) {
        return;
      }

      const key = toLocalDateKey(card.dueDate);
      const current = map.get(key) ?? [];
      current.push(card);
      current.sort(compareCardDates);
      map.set(key, current);
    });

    return map;
  }, [cards]);
  const selectedKey = selectedDate ? toLocalDateKey(selectedDate) : undefined;
  const selectedCards = useMemo(
    () => (selectedKey ? eventsByDate.get(selectedKey) ?? [] : []),
    [eventsByDate, selectedKey],
  );
  const selectedLabel = useMemo(
    () =>
      selectedDate
        ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
        : "Sin fecha seleccionada",
    [selectedDate],
  );
  const visibleMonthCards = useMemo(
    () =>
      cards.filter((card) => {
        if (!card.dueDate) {
          return false;
        }

        return isSameMonth(toLocalCalendarDate(card.dueDate), visibleMonth);
      }),
    [cards, visibleMonth],
  );
  const visibleMonthHighPriorityCards = useMemo(
    () => visibleMonthCards.filter((card) => card.priority === "HIGH").length,
    [visibleMonthCards],
  );
  const visibleMonthOverdueCards = useMemo(
    () => visibleMonthCards.filter((card) => card.isOverdue).length,
    [visibleMonthCards],
  );
  const nextDates = useMemo(
    () =>
      Array.from(eventsByDate.entries())
        .filter(([date]) => parseISO(date) >= today)
        .sort(([left], [right]) => parseISO(left).getTime() - parseISO(right).getTime())
        .slice(0, 5),
    [eventsByDate, today],
  );
  const eventDates = useMemo(
    () => Array.from(eventsByDate.keys()).map((value) => parseISO(value)),
    [eventsByDate],
  );
  const overdueDates = useMemo(
    () =>
      cards
        .filter((card) => card.dueDate && card.isOverdue)
        .map((card) => parseISO(card.dueDate!)),
    [cards],
  );
  const prioritizedCards = useMemo(
    () =>
      cards
        .filter((card) => card.isOverdue || card.priority === "HIGH")
        .sort(compareCardDates)
        .slice(0, 6),
    [cards],
  );

  function handleDateSelection(date: Date | undefined) {
    if (!date) {
      return;
    }

    setSelectedDate(date);
    setVisibleMonth(startOfMonth(date));
  }

  function handleMonthChange(date: Date) {
    setVisibleMonth(startOfMonth(date));
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-gradient-to-r from-teal-500/14 via-cyan-400/8 to-orange-400/14 px-6 py-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Badge variant="secondary" className="w-fit">
                  Ventana editorial
                </Badge>
                <div>
                  <h2 className="font-display text-4xl font-semibold leading-tight">
                    Calendario operativo de entregas
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Revisá el mes, detectá cuellos de botella y abrí rápidamente las
                    tarjetas con vencimiento.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <CalendarMetric
                  className="md:col-span-2"
                  label="Mes visible"
                  value={format(visibleMonth, "MMMM", { locale: es })}
                  valueClassName="capitalize break-words text-[clamp(1.4rem,2.5vw,2.1rem)]"
                  hint={`${visibleMonthCards.length} tarjetas en agenda`}
                />
                <CalendarMetric
                  label="Alta prioridad"
                  value={visibleMonthHighPriorityCards}
                  hint="Tarjetas críticas dentro de este mes"
                />
                <CalendarMetric
                  label="Vencidas del mes"
                  value={visibleMonthOverdueCards}
                  hint="Requieren seguimiento en el mes visible"
                />
              </div>
            </div>
          </div>

          <CardContent className="px-4 pb-5 pt-5 sm:px-6">
            <CalendarMonthPicker
              month={visibleMonth}
              selectedDate={selectedDate}
              eventDates={eventDates}
              overdueDates={overdueDates}
              onSelect={handleDateSelection}
              onMonthChange={handleMonthChange}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Fecha seleccionada</CardTitle>
                  <p className="mt-2 text-sm capitalize text-muted-foreground">
                    {selectedLabel}
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-[22px] bg-primary/10 text-primary">
                  <CalendarClock className="size-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <CalendarMetric
                label="Entregas"
                value={selectedCards.length}
                hint="Tarjetas asignadas a este día"
              />
              <CalendarMetric
                label="Prioridad alta"
                value={selectedCards.filter((card) => card.priority === "HIGH").length}
                hint="Tareas que merecen foco inmediato"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Próximas fechas</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Un paneo rápido de los siguientes hitos del tablero.
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-[22px] bg-secondary text-secondary-foreground">
                  <Layers3 className="size-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextDates.length ? (
                nextDates.map(([dateKey, items]) => (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleDateSelection(parseISO(dateKey))}
                    className="flex w-full items-start justify-between gap-4 rounded-[24px] border border-border bg-background/72 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-background"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        {format(parseISO(dateKey), "EEE", { locale: es })}
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">
                        {format(parseISO(dateKey), "d MMM", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{items.length} tarjetas</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {items[0]?.boardName}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  className="px-4 py-10"
                  title="Sin próximas fechas"
                  description="Cuando haya deadlines futuros van a aparecer en este panel."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Agenda del día</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tarjetas agrupadas por la fecha que elegiste en el calendario.
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-[22px] bg-secondary text-secondary-foreground">
                <Clock3 className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCards.length ? (
              selectedCards.map((card) => <AgendaCard key={card.id} card={card} />)
            ) : (
              <EmptyState
                title="Sin vencimientos ese día"
                description="Elegí otra fecha o asigná un deadline nuevo desde algún tablero."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Atención prioritaria</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fechas vencidas o con más presión operativa.
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-[22px] bg-amber-500/14 text-amber-700 dark:text-amber-300">
                <CircleAlert className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {prioritizedCards.length ? (
              prioritizedCards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/boards/${card.boardId}`}
                    prefetch={false}
                    className="block rounded-[24px] border border-border bg-background/72 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{card.boardName}</Badge>
                      <Badge variant="outline">{getPriorityLabel(card.priority)}</Badge>
                    </div>
                    <h3 className="mt-3 font-semibold">{card.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {card.dueDate
                        ? format(parseISO(card.dueDate), "dd 'de' MMMM", { locale: es })
                        : "Sin fecha"}{" "}
                      · {getStatusLabel(card.status)}
                    </p>
                  </Link>
                ))
            ) : (
              <EmptyState
                className="px-4 py-10"
                title="Sin alertas activas"
                description="El calendario no detectó tareas vencidas ni prioridades altas."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
