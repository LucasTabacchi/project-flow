"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  SlidersHorizontal,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  createBoardCustomFieldAction,
  deleteBoardCustomFieldAction,
  updateBoardCustomFieldAction,
} from "@/app/actions/custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateBoardCustomFields } from "@/lib/board-local-updates";
import { useBoardStore } from "@/stores/board-store";
import type { BoardCustomFieldView, CustomFieldType } from "@/types";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  SELECT: "Selección",
};

function parseOptions(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

type BoardCustomFieldsPanelProps = {
  boardId: string;
  fields: BoardCustomFieldView[];
};

export function BoardCustomFieldsPanel({
  boardId,
  fields,
}: BoardCustomFieldsPanelProps) {
  const mutateBoard = useBoardStore((state) => state.mutateBoard);
  const [items, setItems] = useState(fields);
  const [showForm, setShowForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("TEXT");
  const [optionsInput, setOptionsInput] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(fields);
  }, [fields]);

  function resetForm() {
    setEditingFieldId(null);
    setName("");
    setType("TEXT");
    setOptionsInput("");
  }

  function handleCreateMode() {
    resetForm();
    setShowForm(true);
  }

  function handleEditMode(field: BoardCustomFieldView) {
    setEditingFieldId(field.id);
    setName(field.name);
    setType(field.type);
    setOptionsInput(field.options.join(", "));
    setShowForm(true);
  }

  function syncBoard(nextFields: BoardCustomFieldView[], boardUpdatedAt: string) {
    setItems(nextFields);
    mutateBoard((board) =>
      updateBoardCustomFields(board, nextFields, boardUpdatedAt),
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const payload = {
        boardId,
        name,
        type,
        options: parseOptions(optionsInput),
      };

      const result = editingFieldId
        ? await updateBoardCustomFieldAction({
            ...payload,
            fieldId: editingFieldId,
          })
        : await createBoardCustomFieldAction(payload);

      if (!result.ok || !result.data) {
        toast.error(result.message);
        return;
      }

      toast.success(
        result.message ??
          (editingFieldId
            ? "Campo personalizado actualizado."
            : "Campo personalizado creado."),
      );
      syncBoard(result.data.customFields, result.data.boardUpdatedAt);
      resetForm();
      setShowForm(false);
    });
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      const result = await deleteBoardCustomFieldAction({
        boardId,
        fieldId,
      });

      if (!result.ok || !result.data) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Campo personalizado eliminado.");
      syncBoard(result.data.customFields, result.data.boardUpdatedAt);

      if (editingFieldId === fieldId) {
        resetForm();
        setShowForm(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <div>
            <p className="font-semibold">Campos del tablero</p>
            <p className="text-sm text-muted-foreground">
              Definí metadatos reutilizables como cliente, sprint, costo o canal.
            </p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={handleCreateMode}>
          <Plus className="size-3.5" />
          Nuevo campo
        </Button>
      </div>

      {showForm ? (
        <div className="rounded-[24px] border border-border bg-background/60 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre del campo</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Cliente"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(value) => setType(value as CustomFieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Texto</SelectItem>
                  <SelectItem value="NUMBER">Número</SelectItem>
                  <SelectItem value="SELECT">Selección</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Uso sugerido</Label>
              <div className="rounded-2xl border border-border bg-card/70 px-3 py-3 text-sm text-muted-foreground">
                {type === "TEXT"
                  ? "Ideal para cliente, canal, área o referencias cortas."
                  : type === "NUMBER"
                    ? "Útil para costo, score, puntos o métricas numéricas."
                    : "Perfecto para sprint, etapa, área o categorías cerradas."}
              </div>
            </div>

            {type === "SELECT" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Opciones</Label>
                <Textarea
                  value={optionsInput}
                  onChange={(event) => setOptionsInput(event.target.value)}
                  placeholder={"Backlog, Sprint 14, Sprint 15"}
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Separalas con coma, punto y coma o salto de línea.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Los valores se editan dentro de cada tarjeta y quedan disponibles para todo el tablero.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isPending ||
                  !name.trim() ||
                  (type === "SELECT" && parseOptions(optionsInput).length < 2)
                }
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <TextCursorInput className="size-4" />
                )}
                {editingFieldId ? "Guardar campo" : "Crear campo"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {items.length ? (
        <div className="space-y-3">
          {items.map((field) => (
            <div
              key={field.id}
              className="rounded-[24px] border border-border bg-background/60 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{field.name}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {FIELD_TYPE_LABELS[field.type]}
                    </span>
                  </div>
                  {field.type === "SELECT" ? (
                    <p className="text-sm text-muted-foreground">
                      Opciones: {field.options.join(", ")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Disponible para todas las tarjetas del tablero.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEditMode(field)}
                    disabled={isPending}
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(field.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[24px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay campos personalizados. Creá uno para capturar contexto propio del tablero sin cambiar el modelo base.
        </p>
      )}
    </div>
  );
}
