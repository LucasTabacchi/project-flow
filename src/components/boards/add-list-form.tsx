"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createListAction } from "@/app/actions/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appendListToBoard } from "@/lib/board-local-updates";
import { useBoardStore } from "@/stores/board-store";

type AddListFormProps = {
  boardId: string;
  disabled?: boolean;
};

export function AddListForm({ boardId, disabled = false }: AddListFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const mutateBoard = useBoardStore((state) => state.mutateBoard);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createListAction({
        boardId,
        name,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (!result.data) {
        toast.error("La lista se creó, pero no pudimos actualizar el tablero local.");
        return;
      }

      const payload = result.data;
      toast.success(result.message ?? "Lista creada.");
      setName("");
      setOpen(false);
      mutateBoard((board) =>
        appendListToBoard(board, payload.list, payload.boardUpdatedAt),
      );
    });
  }

  return (
    <div className="w-[min(88vw,320px)] snap-start shrink-0">
      {!open ? (
        <Button
          type="button"
          variant="secondary"
          className="glass-panel h-auto w-full justify-start rounded-[28px] border border-dashed border-border px-5 py-4"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" />
          Agregar lista
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="glass-panel rounded-[28px] border border-border p-4"
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la lista"
            autoFocus
            required
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? "Creando..." : "Crear"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                setOpen(false);
                setName("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
