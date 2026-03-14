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
      const result = await createBoardAction({
        name,
        description,
        theme,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Tablero creado.");
      setOpen(false);
      setName("");
      setDescription("");
      setTheme(DEFAULT_BOARD_THEME);
      router.push(`/boards/${result.data?.boardId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="size-4" />
          Nuevo tablero
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crear tablero</DialogTitle>
          <DialogDescription>
            Elegí un nombre, una descripción breve y un fondo visual para arrancar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="board-name">Nombre</Label>
                <Input
                  id="board-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Sprint de producto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="board-description">Descripción</Label>
                <Textarea
                  id="board-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Qué equipo, objetivo y foco va a tener este tablero."
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tema visual</Label>
              <div className="grid gap-3">
                {BOARD_THEMES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTheme(item.value)}
                    className={cn(
                      "rounded-[28px] border border-border p-4 text-left transition hover:-translate-y-0.5",
                      item.surfaceClass,
                      theme === item.value && "ring-2 ring-primary",
                    )}
                  >
                    <div
                      className={`mb-4 h-20 rounded-[20px] bg-gradient-to-br ${item.gradientClass}`}
                    />
                    <div className="font-display text-lg font-semibold">
                      {item.name}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear tablero"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
