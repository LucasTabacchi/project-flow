export const fieldBaseClassName =
  "w-full border border-border bg-input text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50";

export const fieldControlClassName = `${fieldBaseClassName} h-11 rounded-2xl px-4 py-2`;

export const fieldTriggerClassName = `${fieldControlClassName} flex items-center justify-between gap-3`;

export const fieldSelectClassName =
  `${fieldControlClassName} appearance-none pr-10`;

export const fieldTextareaClassName =
  `${fieldBaseClassName} min-h-28 rounded-3xl px-4 py-3`;
