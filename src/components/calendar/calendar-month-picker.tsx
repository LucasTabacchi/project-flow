"use client";

import { useMemo } from "react";
import { DayPicker } from "react-day-picker";

type CalendarMonthPickerProps = {
  month: Date;
  selectedDate: Date | undefined;
  eventDates: Date[];
  overdueDates: Date[];
  onSelect: (date: Date | undefined) => void;
  onMonthChange: (date: Date) => void;
};

export function CalendarMonthPicker({
  month,
  selectedDate,
  eventDates,
  overdueDates,
  onSelect,
  onMonthChange,
}: CalendarMonthPickerProps) {
  const modifiers = useMemo(
    () => ({
      hasEvents: eventDates,
      hasOverdue: overdueDates,
    }),
    [eventDates, overdueDates],
  );

  return (
    <DayPicker
      mode="single"
      showOutsideDays
      month={month}
      selected={selectedDate}
      onSelect={onSelect}
      onMonthChange={onMonthChange}
      modifiers={modifiers}
      modifiersClassNames={{
        selected: "bg-primary text-primary-foreground shadow-sm",
        today: "ring-1 ring-primary/40",
        hasEvents: "bg-primary/8 text-primary dark:bg-primary/15 dark:text-primary",
        hasOverdue:
          "bg-amber-500/12 text-amber-900 dark:bg-amber-500/18 dark:text-amber-200",
      }}
      classNames={{
        root: "w-full",
        months: "w-full",
        month: "space-y-5",
        month_caption: "flex items-center justify-between gap-4 px-2",
        caption_label: "font-display text-xl font-semibold capitalize",
        nav: "flex items-center gap-2",
        button_previous:
          "flex size-10 items-center justify-center rounded-2xl border border-border bg-background/80 transition hover:bg-secondary",
        button_next:
          "flex size-10 items-center justify-center rounded-2xl border border-border bg-background/80 transition hover:bg-secondary",
        month_grid: "w-full border-separate border-spacing-y-2",
        weekdays: "grid grid-cols-7 gap-2 px-1",
        weekday:
          "text-center text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
        week: "grid grid-cols-7 gap-2",
        day: "flex justify-center",
        day_button:
          "flex size-12 items-center justify-center rounded-2xl text-sm font-medium transition hover:bg-secondary hover:text-foreground",
        outside: "text-muted-foreground/35",
        disabled: "opacity-35",
        hidden: "invisible",
      }}
    />
  );
}
