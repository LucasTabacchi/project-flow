"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createLabelAction,
  deleteBoardAction,
  updateBoardAction,
} from "@/app/actions/boards";
import { InviteMemberDialog } from "@/components/boards/invite-member-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { BOARD_THEMES, LABEL_COLORS, LABEL_COLOR_STYLES } from "@/lib/constants";
import { getBoardTheme, getRoleLabel } from "@/lib/utils";
import type { BoardPageData } from "@/types";

type BoardHeaderProps = {
  board: BoardPageData;
};

export function BoardHeader({ board }: BoardHeaderProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  const [theme, setTheme] = useState(board.theme);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("SKY");
  const [isPending, startTransition] = useTransition();
  const themeConfig = getBoardTheme(board.theme);
  const onlineUsers = board.presence;
  const onlineUserIds = new Set(onlineUsers.map((entry) => entry.userId));

  function handleBoardSave() {
    startTransition(async () => {
      const result = await updateBoardAction({
        boardId: board.id,
        name,
        description,
        theme,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Tablero actualizado.");
      setSettingsOpen(false);
      router.refresh();
    });
  }

  function handleDeleteBoard() {
    startTransition(async () => {
      const result = await deleteBoardAction({
        boardId: board.id,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Tablero eliminado.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleCreateLabel() {
    startTransition(async () => {
      const result = await createLabelAction({
        boardId: board.id,
        name: labelName,
        color: labelColor,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Etiqueta creada.");
      setLabelName("");
      setLabelColor("SKY");
      setLabelOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <section className="glass-panel overflow-hidden rounded-[32px] border border-border">
        <div className={`h-40 bg-gradient-to-r ${themeConfig.gradientClass}`} />
        <div className="-mt-10 space-y-5 px-6 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge className={themeConfig.chipClass}>{getRoleLabel(board.role)}</Badge>
              <div>
                <h2 className="font-display text-4xl font-semibold">{board.name}</h2>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  {board.description || "Este tablero todavía no tiene descripción."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {board.permissions.canManageMembers ? (
                <InviteMemberDialog boardId={board.id} />
              ) : null}
              {board.permissions.canEdit ? (
                <Button variant="secondary" onClick={() => setLabelOpen(true)}>
                  <Tags className="size-4" />
                  Nueva etiqueta
                </Button>
              ) : null}
              {board.permissions.canEdit ? (
                <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="size-4" />
                  Configurar
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-wrap gap-3">
              <div className="rounded-[24px] border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Tareas
                </p>
                <p className="mt-2 text-2xl font-semibold">{board.stats.totalCards}</p>
              </div>
              <div className="rounded-[24px] border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Completadas
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {board.stats.completedCards}
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Vencidas
                </p>
                <p className="mt-2 text-2xl font-semibold">{board.stats.overdueCards}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-background/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Equipo</p>
                  <p className="text-xs text-muted-foreground">
                    {onlineUsers.length
                      ? `${onlineUsers.length} online ahora`
                      : "Sin miembros online en este momento"}
                  </p>
                </div>
                {onlineUsers.length ? (
                  <div className="flex -space-x-2">
                    {onlineUsers.slice(0, 4).map((member) => (
                      <div
                        key={member.userId}
                        className="rounded-full border-2 border-background shadow-sm"
                        title={member.name}
                      >
                        <UserAvatar
                          name={member.name}
                          src={member.avatarUrl}
                          className="size-9"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {board.members.map((member) => (
                  <div
                    key={member.userId}
                    className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${
                      onlineUserIds.has(member.userId)
                        ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                        : "bg-card/80"
                    }`}
                  >
                    <div className="relative">
                      <UserAvatar
                        name={member.name}
                        src={member.avatarUrl}
                        className="size-8"
                      />
                      <span
                        className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background ${
                          onlineUserIds.has(member.userId)
                            ? "bg-emerald-500"
                            : "bg-muted"
                        }`}
                      />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {onlineUserIds.has(member.userId)
                          ? `Online · ${getRoleLabel(member.role)}`
                          : getRoleLabel(member.role)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {board.labels.map((label) => (
              <Badge
                key={label.id}
                className={LABEL_COLOR_STYLES[label.color].soft}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configurar tablero</DialogTitle>
            <DialogDescription>
              Actualizá nombre, descripción y visual del tablero.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {BOARD_THEMES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTheme(item.value)}
                  className={`rounded-[28px] border border-border p-4 text-left transition hover:-translate-y-0.5 ${item.surfaceClass} ${
                    theme === item.value ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div
                    className={`mb-3 h-20 rounded-[20px] bg-gradient-to-br ${item.gradientClass}`}
                  />
                  <p className="font-display text-lg font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="justify-between sm:justify-between">
            {board.permissions.canDelete ? (
              <Button
                variant="destructive"
                onClick={handleDeleteBoard}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
                Eliminar tablero
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleBoardSave} disabled={isPending}>
                Guardar cambios
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={labelOpen} onOpenChange={setLabelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva etiqueta</DialogTitle>
            <DialogDescription>
              Creá etiquetas para clasificar tarjetas por foco, equipo o urgencia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={labelName}
                onChange={(event) => setLabelName(event.target.value)}
                placeholder="Ej. QA"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={labelColor} onValueChange={setLabelColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLabelOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLabel} disabled={isPending}>
              Crear etiqueta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
