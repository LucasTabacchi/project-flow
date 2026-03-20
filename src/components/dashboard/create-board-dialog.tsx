"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { createBoardAction } from "@/app/actions/boards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BOARD_THEMES, DEFAULT_BOARD_THEME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CreateBoardDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [theme, setTheme] = useState(DEFAULT_BOARD_THEME);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createBoardAction({ name, description, theme });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message ?? "Tablero creado.");
      setOpen(false);
      setName("");
      setDescription("");
      setTheme(DEFAULT_BOARD_THEME);
      router.push(`/boards/${result.data?.boardId}`);
    });
  }

  const selectedTheme = BOARD_THEMES.find((t) => t.value === theme) ?? BOARD_THEMES[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="size-4" />
          Nuevo tablero
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-3xl overflow-hidden">

        {/* Header fijo */}
        <div className="shrink-0 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogHeader>
            <DialogTitle>Crear tablero</DialogTitle>
            <DialogDescription>
              Elegí un nombre, una descripción breve y un fondo visual para arrancar.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body: en mobile columna simple, en desktop grid 2 cols */}
        <form
          id="create-board-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {/* ── Layout desktop: 2 columnas ── */}
          <div className="hidden md:grid md:grid-cols-[1fr_280px] md:gap-6 lg:grid-cols-[1fr_300px] px-6 pb-4">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="board-name-d">Nombre</Label>
                <Input
                  id="board-name-d"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sprint de producto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="board-desc-d">Descripción</Label>
                <Textarea
                  id="board-desc-d"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qué equipo, objetivo y foco va a tener este tablero."
                  className="resize-none"
                  rows={4}
                />
              </div>
              {/* Vista previa desktop */}
              <div>
                <Label className="mb-2 block">Vista previa</Label>
                <div className={cn(
                  "relative overflow-hidden rounded-2xl border border-white/15 p-5 text-white bg-gradient-to-br",
                  selectedTheme.gradientClass,
                )}>
                  <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/20 blur-2xl" />
                  <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Tablero</p>
                  <p className="relative mt-2 font-display text-2xl font-semibold leading-snug">
                    {name || "Sin nombre aún"}
                  </p>
                  {description && (
                    <p className="relative mt-1.5 line-clamp-2 text-sm text-white/75">{description}</p>
                  )}
                </div>
              </div>
            </div>
            {/* Columna derecha — temas con scroll propio */}
            <div className="flex flex-col gap-2">
              <Label>Tema visual</Label>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[360px] pr-1">
                {BOARD_THEMES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTheme(item.value)}
                    className={cn(
                      "rounded-2xl border border-border p-3 text-left transition hover:-translate-y-0.5",
                      item.surfaceClass,
                      theme === item.value
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : "hover:border-primary/30",
                    )}
                  >
                    <div className={cn("mb-2.5 h-12 rounded-xl bg-gradient-to-br", item.gradientClass)} />
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display text-sm font-semibold">{item.name}</span>
                      {theme === item.value && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
                          <svg className="size-3 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Layout mobile: columna única, temas con scroll horizontal propio ── */}
          <div className="md:hidden px-4 pb-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="board-name-m">Nombre</Label>
              <Input
                id="board-name-m"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sprint de producto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-desc-m">Descripción</Label>
              <Textarea
                id="board-desc-m"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué equipo, objetivo y foco va a tener este tablero."
                className="resize-none"
                rows={4}
              />
            </div>

            {/* Temas: scroll horizontal completamente aislado */}
            <div className="space-y-2">
              <Label>Tema visual</Label>
              {/*
                El truco: el contenedor externo tiene overflow-hidden para que
                nada escape. El interno tiene overflow-x-auto con scroll-snap
                y touch-action pan-x para que el browser sepa que este elemento
                maneja el gesto horizontal, sin propagarlo al modal.
              */}
              <div className="overflow-hidden rounded-2xl">
                <div
                  className="flex gap-3 overflow-x-auto pb-2"
                  style={{
                    touchAction: "pan-x",
                    WebkitOverflowScrolling: "touch",
                    scrollSnapType: "x mandatory",
                  }}
                >
                  {BOARD_THEMES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTheme(item.value)}
                      style={{ scrollSnapAlign: "start", minWidth: "160px", maxWidth: "160px" }}
                      className={cn(
                        "shrink-0 rounded-2xl border border-border p-3 text-left transition",
                        item.surfaceClass,
                        theme === item.value
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "",
                      )}
                    >
                      <div className={cn("mb-2.5 h-10 rounded-xl bg-gradient-to-br", item.gradientClass)} />
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-sm font-semibold leading-snug">{item.name}</span>
                        {theme === item.value && (
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary">
                            <svg className="size-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer fijo */}
        <div className="shrink-0 border-t border-border/60 px-5 py-4 sm:px-6">
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button form="create-board-form" type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear tablero"}
            </Button>
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  );
}
