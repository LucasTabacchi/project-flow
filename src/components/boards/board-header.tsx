"use client";

import { memo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CircleCheckBig,
  Layers3,
  LogOut,
  Settings2,
  Tags,
  Trash2,
  TriangleAlert,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

import {
  createLabelAction,
  deleteBoardAction,
  leaveBoardAction,
  updateBoardAction,
} from "@/app/actions/boards";
import { BoardActivityPanel } from "@/components/boards/board-activity-panel";
import { InviteMemberDialog } from "@/components/boards/invite-member-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/ui/metric-card";
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
  appendLabelToBoard,
  updateBoardMetadata,
} from "@/lib/board-local-updates";
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
import { useBoardStore } from "@/stores/board-store";
import type { BoardPageData } from "@/types";

type BoardHeaderData = Pick<
  BoardPageData,
  | "id"
  | "name"
  | "description"
  | "theme"
  | "role"
  | "permissions"
  | "labels"
  | "members"
  | "presence"
  | "stats"
>;

type BoardHeaderProps = {
  board: BoardHeaderData;
};

function BoardHeaderComponent({ board }: BoardHeaderProps) {
  const router = useRouter();
  const mutateBoard = useBoardStore((state) => state.mutateBoard);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
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

      if (!result.data) {
        toast.error("Guardamos los cambios, pero no pudimos actualizar el tablero local.");
        return;
      }

      const payload = result.data;
      toast.success(result.message ?? "Tablero actualizado.");
      setSettingsOpen(false);
      mutateBoard((currentBoard) =>
        updateBoardMetadata(currentBoard, {
          name,
          description,
          theme,
          updatedAt: payload.boardUpdatedAt,
        }),
      );
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
    });
  }

  function handleLeaveBoard() {
    startTransition(async () => {
      const result = await leaveBoardAction({
        boardId: board.id,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Abandonaste el tablero.");
      router.push("/dashboard");
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

      if (!result.data) {
        toast.error("La etiqueta se creó, pero no pudimos actualizar el tablero local.");
        return;
      }

      const payload = result.data;
      toast.success(result.message ?? "Etiqueta creada.");
      setLabelName("");
      setLabelColor("SKY");
      setLabelOpen(false);
      mutateBoard((currentBoard) =>
        appendLabelToBoard(
          currentBoard,
          payload.label,
          payload.boardUpdatedAt,
        ),
      );
    });
  }

  return (
    <>
      <section className="glass-panel overflow-hidden rounded-[32px] border border-border">

        {/* Banner gradiente — sin botones, solo visual */}
        <div className={`h-32 bg-gradient-to-r sm:h-40 ${themeConfig.gradientClass}`} />

        {/* Área inferior */}
        <div className="-mt-8 space-y-5 px-4 pb-4 sm:-mt-10 sm:px-6 sm:pb-6">

          <Badge className={themeConfig.chipClass}>{getRoleLabel(board.role)}</Badge>

          {/* Título + botones en la misma fila */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight">
              {board.name}
            </h2>
            <div className="hidden shrink-0 items-center gap-2 pt-1 sm:flex">
              {board.permissions.canManageMembers ? (
                <InviteMemberDialog boardId={board.id} />
              ) : null}
              {board.permissions.canEdit ? (
                <Button variant="secondary" onClick={() => setLabelOpen(true)} className="shrink-0">
                  <Tags className="size-4" />
                  Nueva etiqueta
                </Button>
              ) : null}
              {board.permissions.canEdit ? (
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => {
                    setName(board.name);
                    setDescription(board.description ?? "");
                    setTheme(board.theme);
                    setSettingsOpen(true);
                  }}
                >
                  <Settings2 className="size-4" />
                  Configurar
                </Button>
              ) : null}
              {board.permissions.canDelete ? (
                <Button variant="destructive" className="shrink-0" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              ) : null}
              {board.role !== "OWNER" ? (
                <Button variant="secondary" className="shrink-0" onClick={() => setLeaveOpen(true)}>
                  <LogOut className="size-4" />
                  Dejar tablero
                </Button>
              ) : null}
              <Button variant="secondary" className="shrink-0" onClick={() => setActivityOpen(true)}>
                <Activity className="size-4" />
                Actividad
              </Button>
            </div>
          </div>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            {board.description || "Este tablero todavía no tiene descripción."}
          </p>

          {/* Botones mobile */}
          <div className="flex flex-wrap gap-2 sm:hidden">
            {board.permissions.canManageMembers ? (
              <InviteMemberDialog boardId={board.id} />
            ) : null}
            {board.permissions.canEdit ? (
              <Button variant="secondary" onClick={() => setLabelOpen(true)} className="shrink-0">
                <Tags className="size-4" />
                Nueva etiqueta
              </Button>
            ) : null}
            {board.permissions.canEdit ? (
              <Button
                variant="secondary"
                className="shrink-0"
                onClick={() => {
                  setName(board.name);
                  setDescription(board.description ?? "");
                  setTheme(board.theme);
                  setSettingsOpen(true);
                }}
              >
                <Settings2 className="size-4" />
                Configurar
              </Button>
            ) : null}
            {board.permissions.canDelete ? (
              <Button variant="destructive" className="shrink-0" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            ) : null}
            {board.role !== "OWNER" ? (
              <Button variant="secondary" className="shrink-0" onClick={() => setLeaveOpen(true)}>
                <LogOut className="size-4" />
                Dejar tablero
              </Button>
            ) : null}
            <Button variant="secondary" className="shrink-0" onClick={() => setActivityOpen(true)}>
              <Activity className="size-4" />
              Actividad
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricTile
                label="Tareas"
                value={board.stats.totalCards}
                icon={Layers3}
              />
              <MetricTile
                label="Completadas"
                value={board.stats.completedCards}
                icon={CircleCheckBig}
                tone="success"
              />
              <MetricTile
                label="Vencidas"
                value={board.stats.overdueCards}
                icon={TriangleAlert}
                tone="warning"
              />
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
        <DialogContent className="sm:max-w-3xl">
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

          <DialogFooter className="justify-end gap-2">
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBoardSave} disabled={isPending}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={labelOpen} onOpenChange={setLabelOpen}>
        <DialogContent className="sm:max-w-lg">
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
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar el tablero?</DialogTitle>
            <DialogDescription>
              Vas a eliminar permanentemente <strong>{board.name}</strong> junto con todas sus listas, tarjetas, comentarios y adjuntos.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/6 px-4 py-3 text-sm text-destructive">
            Esta acción es irreversible. Todos los miembros perderán el acceso inmediatamente.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBoard}
              disabled={isPending}
            >
              <Trash2 className="size-4" />
              {isPending ? "Eliminando..." : "Confirmar y eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Dejar el tablero?</DialogTitle>
            <DialogDescription>
              Vas a perder el acceso a <strong>{board.name}</strong> y a todas sus tarjetas. Solo el propietario puede volverte a invitar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-warning-surface bg-warning-surface/40 px-4 py-3 text-sm text-warning-foreground">
            Esta acción no se puede deshacer. Si fuiste invitado, necesitarás una nueva invitación para volver a acceder.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveBoard}
              disabled={isPending}
            >
              <LogOut className="size-4" />
              {isPending ? "Saliendo..." : "Confirmar y salir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BoardActivityPanel
        boardId={board.id}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
    </>
  );
}

export const BoardHeader = memo(BoardHeaderComponent);
