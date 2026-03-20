"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookTemplate, Globe, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createBoardFromTemplateAction,
  deleteTemplateAction,
  listBoardTemplatesAction,
  type TemplateSummary,
} from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOARD_THEMES, DEFAULT_BOARD_THEME } from "@/lib/constants";
import { cn, getBoardTheme } from "@/lib/utils";

type TemplateBrowserDialogProps = {
  trigger?: React.ReactNode;
};

export function TemplateBrowserDialog({ trigger }: TemplateBrowserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [own, setOwn] = useState<TemplateSummary[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<TemplateSummary[]>([]);
  const [selected, setSelected] = useState<TemplateSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTheme, setNewTheme] = useState(DEFAULT_BOARD_THEME);

  async function loadTemplates() {
    const result = await listBoardTemplatesAction();
    setLoading(false);
    if (result.ok && result.data) {
      setOwn(result.data.own);
      setPublicTemplates(result.data.public);
    }
  }

  useEffect(() => {
    if (open) void loadTemplates();
  }, [open]);

  function handleSelectTemplate(t: TemplateSummary) {
    setSelected(t);
    setNewName(`${t.name} (copia)`);
    setNewTheme(t.theme);
  }

  function handleCreateFromTemplate() {
    if (!selected) return;
    startTransition(async () => {
      const result = await createBoardFromTemplateAction({
        templateId: selected.id,
        name: newName,
        description: newDescription || undefined,
        theme: newTheme,
      });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message ?? "Tablero creado.");
      setOpen(false);
      router.push(`/boards/${result.data?.boardId}`);
    });
  }

  function handleDeleteTemplate(templateId: string) {
    startTransition(async () => {
      const result = await deleteTemplateAction({ templateId });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success("Plantilla eliminada.");
      setOwn((prev) => prev.filter((t) => t.id !== templateId));
      if (selected?.id === templateId) setSelected(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" className="gap-2">
            <BookTemplate className="size-4" />
            Desde plantilla
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh]">
        <div className="flex h-full min-h-0 flex-col sm:flex-row">
          {/* Left: template list */}
          <div className="w-full overflow-y-auto border-b border-border sm:w-64 sm:border-r sm:border-b-0">
            <div className="p-4">
              <DialogHeader className="mb-3">
                <DialogTitle className="text-base">Plantillas</DialogTitle>
                <DialogDescription className="text-xs">
                  Elegí una base para tu nuevo tablero.
                </DialogDescription>
              </DialogHeader>

              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Own templates */}
                  {own.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Mis plantillas
                      </p>
                      <div className="space-y-1">
                        {own.map((t) => (
                          <TemplateListItem
                            key={t.id}
                            template={t}
                            selected={selected?.id === t.id}
                            onSelect={() => handleSelectTemplate(t)}
                            onDelete={() => handleDeleteTemplate(t.id)}
                            showDelete
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Public templates */}
                  {publicTemplates.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Plantillas públicas
                      </p>
                      <div className="space-y-1">
                        {publicTemplates.map((t) => (
                          <TemplateListItem
                            key={t.id}
                            template={t}
                            selected={selected?.id === t.id}
                            onSelect={() => handleSelectTemplate(t)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {own.length === 0 && publicTemplates.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No hay plantillas disponibles todavía.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: create form */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selected ? (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <BookTemplate className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Seleccioná una plantilla para configurar tu tablero.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selected.name}</h3>
                  {selected.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{selected.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.listCount} lista{selected.listCount !== 1 ? "s" : ""} ·{" "}
                    {selected.cardCount} tarjeta{selected.cardCount !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Nombre del nuevo tablero</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre del tablero…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Descripción (opcional)</Label>
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Descripción opcional…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tema</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BOARD_THEMES.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setNewTheme(theme.value)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left transition",
                          newTheme === theme.value
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card/70 hover:border-primary/40",
                        )}
                      >
                        <div className={cn("mb-1 h-4 w-full rounded-md bg-gradient-to-r", theme.gradientClass)} />
                        <p className="text-xs font-medium">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateFromTemplate}
                  disabled={isPending || !newName.trim()}
                >
                  {isPending ? (
                    <><Loader2 className="size-4 animate-spin" /> Creando...</>
                  ) : (
                    <><Plus className="size-4" /> Crear tablero</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template list item ────────────────────────────────────────────────────────

function TemplateListItem({
  template,
  selected,
  onSelect,
  onDelete,
  showDelete = false,
}: {
  template: TemplateSummary;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  const theme = getBoardTheme(template.theme);

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition",
        selected ? "bg-primary/10" : "hover:bg-secondary/60",
      )}
      onClick={onSelect}
    >
      <div className={cn("size-5 shrink-0 rounded-md bg-gradient-to-br", theme.gradientClass)} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", selected && "text-primary")}>
          {template.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {template.listCount}L · {template.cardCount}T
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {template.isPublic ? (
          <Globe className="size-3 text-muted-foreground/60" />
        ) : (
          <Lock className="size-3 text-muted-foreground/60" />
        )}
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
