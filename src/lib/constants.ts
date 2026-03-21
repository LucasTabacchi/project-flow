export const BOARD_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export const CARD_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const CARD_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
] as const;
export const CUSTOM_FIELD_TYPES = ["TEXT", "NUMBER", "SELECT"] as const;
export const LABEL_COLORS = [
  "SLATE",
  "SKY",
  "EMERALD",
  "AMBER",
  "ROSE",
  "VIOLET",
] as const;

export const DEFAULT_BOARD_THEME = "aurora";
export const SESSION_DURATION_DAYS = 14;

export const ROLE_LABELS = {
  OWNER: "Propietario",
  EDITOR: "Editor",
  VIEWER: "Lector",
} as const;

export const PRIORITY_LABELS = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
} as const;

export const STATUS_LABELS = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  IN_REVIEW: "En revisión",
  DONE: "Hecha",
  BLOCKED: "Bloqueada",
} as const;

export const BOARD_THEMES = [
  {
    value: "aurora",
    name: "Aurora",
    description: "Tonos aqua y mint para tableros de producto y colaboración.",
    gradientClass:
      "from-teal-500 via-cyan-400 to-emerald-400 dark:from-teal-500 dark:via-cyan-500 dark:to-emerald-500",
    surfaceClass:
      "bg-gradient-to-br from-teal-500/15 via-cyan-400/10 to-emerald-400/15",
    chipClass:
      "bg-teal-500/15 text-teal-900 ring-teal-500/20 dark:text-teal-100",
  },
  {
    value: "volcano",
    name: "Volcano",
    description: "Naranjas y coral para equipos con ritmo alto de entrega.",
    gradientClass:
      "from-orange-500 via-rose-500 to-amber-400 dark:from-orange-500 dark:via-rose-500 dark:to-amber-500",
    surfaceClass:
      "bg-gradient-to-br from-orange-500/15 via-rose-500/10 to-amber-400/15",
    chipClass:
      "bg-orange-500/15 text-orange-900 ring-orange-500/20 dark:text-orange-100",
  },
  {
    value: "midnight",
    name: "Midnight",
    description: "Azules profundos y violetas suaves para operaciones y roadmap.",
    gradientClass:
      "from-slate-700 via-indigo-500 to-violet-500 dark:from-slate-800 dark:via-indigo-500 dark:to-violet-500",
    surfaceClass:
      "bg-gradient-to-br from-slate-800/20 via-indigo-500/10 to-violet-500/15",
    chipClass:
      "bg-indigo-500/15 text-indigo-900 ring-indigo-500/20 dark:text-indigo-100",
  },
  {
    value: "sunrise",
    name: "Sunrise",
    description: "Arena, melon y rosa para tableros de marketing y contenido.",
    gradientClass:
      "from-amber-300 via-orange-300 to-rose-400 dark:from-amber-400 dark:via-orange-400 dark:to-rose-500",
    surfaceClass:
      "bg-gradient-to-br from-amber-300/20 via-orange-300/10 to-rose-400/15",
    chipClass:
      "bg-amber-400/15 text-amber-950 ring-amber-500/20 dark:text-amber-100",
  },
] as const;

export const LABEL_COLOR_STYLES = {
  SLATE: {
    dot: "bg-slate-500",
    soft: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
  },
  SKY: {
    dot: "bg-sky-500",
    soft: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  },
  EMERALD: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  },
  AMBER: {
    dot: "bg-amber-500",
    soft: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  },
  ROSE: {
    dot: "bg-rose-500",
    soft: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
  },
  VIOLET: {
    dot: "bg-violet-500",
    soft: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  },
} as const;
