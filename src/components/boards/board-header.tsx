"use client";

import { memo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  BookTemplate,
  Bot,
  CircleCheckBig,
  Layers3,
  LogOut,
  Mail,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
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
import { BoardExportMenu } from "@/components/boards/board-export-menu";
import { saveAsBoardTemplateAction } from "@/app/actions/templates";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  | "customFields"
  | "lists"
  | "members"
  | "presence"
  | "stats"
>;

type BoardHeaderProps = {
  board: BoardHeaderData;
};

const BoardActivityPanel = dynamic(
  () =>
    import("@/components/boards/board-activity-panel").then((module) => ({
      default: module.BoardActivityPanel,
    })),
  {
    loading: () => null,
  },
);

const BoardAutomationsPanel = dynamic(
  () =>
    import("@/components/boards/board-automations-panel").then((module) => ({
      default: module.BoardAutomationsPanel,
    })),
  {
    loading: () => null,
  },
);

const BoardCustomFieldsPanel = dynamic(
  () =>
    import("@/components/boards/board-custom-fields-panel").then((module) => ({
      default: module.BoardCustomFieldsPanel,
    })),
  {
    loading: () => null,
  },
);

const BoardEmailNotificationsPanel = dynamic(
  () =>
    import("@/components/boards/board-email-notifications-panel").then((module) => ({
      default: module.BoardEmailNotificationsPanel,
    })),
  {
    loading: () => null,
  },
);

const RecurringCardsPanel = dynamic(
  () =>
    import("@/components/boards/recurring-cards-panel").then((module) => ({
      default: module.RecurringCardsPanel,
    })),
  {
    loading: () => null,
  },
);

function BoardHeaderComponent({ board }: BoardHeaderProps) {
  const router = useRouter();
  const mutateBoard = useBoardStore((state) => state.mutateBoard);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [emailNotificationsOpen, setEmailNotificationsOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templatePublic, setTemplatePublic] = useState(false);
  const [templateIncludeCards, setTemplateIncludeCards] = useState(true);
  const templateNameInputRef = useRef<HTMLInputElement | null>(null);
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

  function handleSaveAsTemplate() {
    startTransition(async () => {
      const result = await saveAsBoardTemplateAction({
        boardId: board.id,
        name: templateName || board.name,
        description: templateDesc || undefined,
        isPublic: templatePublic,
        includeCards: templateIncludeCards,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Plantilla guardada.");
      setTemplateOpen(false);
      setTemplateName("");
      setTemplateDesc("");
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
        <div className={`relative overflow-hidden bg-gradient-to-r ${themeConfig.gradientClass}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="relative flex min-h-[12rem] flex-col justify-end gap-3 px-4 pb-5 pt-16 sm:min-h-[15rem] sm:px-6 sm:pb-7 sm:pt-20">
            <Badge className={`${themeConfig.chipClass} w-fit border border-white/10 shadow-sm backdrop-blur-sm`}>
              {getRoleLabel(board.role)}
            </Badge>
            <h2 className="max-w-5xl min-w-0 font-display text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[0.95] tracking-tight text-foreground">
              {board.name}
            </h2>
          </div>
        </div>

        {/* Área inferior */}
        <div className="space-y-5 px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <p className="max-w-3xl text-muted-foreground">
              {board.description || "Este tablero todavía no tiene descripción."}
            </p>
            <div className="hidden flex-wrap items-center gap-2 pt-1 sm:flex 2xl:max-w-[62%] 2xl:justify-end">
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
              <BoardExportMenu boardId={board.id} />
              {board.permissions.canEdit ? (
                <Button variant="secondary" className="shrink-0" onClick={() => setRecurringOpen(true)}>
                  <RefreshCw className="size-4" />
                  Recurrentes
                </Button>
              ) : null}
              {board.permissions.canDelete ? (
                <>
                <Button variant="secondary" className="shrink-0" onClick={() => setAutomationsOpen(true)}>
                  <Bot className="size-4" />
                  Automatizaciones
                </Button>
                  <Button variant="secondary" className="shrink-0" onClick={() => setCustomFieldsOpen(true)}>
                    <SlidersHorizontal className="size-4" />
                    Campos
                  </Button>
                  <Button variant="secondary" className="shrink-0" onClick={() => setEmailNotificationsOpen(true)}>
                    <Mail className="size-4" />
                    Emails
                  </Button>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => { setTemplateName(board.name); setTemplateOpen(true); }}
                  >
                    <BookTemplate className="size-4" />
                    Guardar plantilla
                  </Button>
                  <Button variant="destructive" className="shrink-0" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="size-4" />
                    Eliminar
                  </Button>
                </>
              ) : null}
            </div>
          </div>

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
            <BoardExportMenu boardId={board.id} align="start" />
            {board.permissions.canEdit ? (
              <Button variant="secondary" className="shrink-0" onClick={() => setRecurringOpen(true)}>
                <RefreshCw className="size-4" />
                Recurrentes
              </Button>
            ) : null}
            {board.permissions.canDelete ? (
              <>
                <Button variant="secondary" className="shrink-0" onClick={() => setAutomationsOpen(true)}>
                  <Bot className="size-4" />
                  Automatizaciones
                </Button>
                <Button variant="secondary" className="shrink-0" onClick={() => setCustomFieldsOpen(true)}>
                  <SlidersHorizontal className="size-4" />
                  Campos
                </Button>
                <Button variant="secondary" className="shrink-0" onClick={() => setEmailNotificationsOpen(true)}>
                  <Mail className="size-4" />
                  Emails
                </Button>
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => { setTemplateName(board.name); setTemplateOpen(true); }}
                >
                  <BookTemplate className="size-4" />
                  Guardar plantilla
                </Button>
                <Button variant="destructive" className="shrink-0" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              </>
            ) : null}
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
      {activityOpen ? (
        <BoardActivityPanel
          boardId={board.id}
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
        />
      ) : null}

      <Dialog open={automationsOpen} onOpenChange={setAutomationsOpen}>
        {automationsOpen ? (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Automatizaciones</DialogTitle>
              <DialogDescription>
                Reglas del tablero que reaccionan cuando una tarjeta cambia de estado.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <BoardAutomationsPanel
                boardId={board.id}
                lists={board.lists ?? []}
                members={board.members}
              />
            </ScrollArea>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={emailNotificationsOpen} onOpenChange={setEmailNotificationsOpen}>
        {emailNotificationsOpen ? (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Notificaciones por email</DialogTitle>
              <DialogDescription>
                Configurá alertas internas del tablero con destinatarios propios y cola de envío persistida.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              <BoardEmailNotificationsPanel boardId={board.id} />
            </ScrollArea>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={customFieldsOpen} onOpenChange={setCustomFieldsOpen}>
        {customFieldsOpen ? (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Campos personalizados</DialogTitle>
              <DialogDescription>
                Definí los campos propios de este tablero para completarlos en cada tarjeta.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              <BoardCustomFieldsPanel boardId={board.id} fields={board.customFields} />
            </ScrollArea>
          </DialogContent>
        ) : null}
      </Dialog>

      {/* Recurring cards dialog */}
      <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
        {recurringOpen ? (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tarjetas recurrentes</DialogTitle>
              <DialogDescription>
                Configurá tarjetas que se crean automáticamente con una frecuencia definida.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              <RecurringCardsPanel
                boardId={board.id}
                lists={board.lists ?? []}
                canEdit={board.permissions.canEdit}
              />
            </ScrollArea>
          </DialogContent>
        ) : null}
      </Dialog>

      {/* Save as template dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent
          className="max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              const input = templateNameInputRef.current;
              if (!input) {
                return;
              }

              input.focus({ preventScroll: true });
              const cursorPosition = input.value.length;
              input.setSelectionRange(cursorPosition, cursorPosition);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Guardar como plantilla</DialogTitle>
            <DialogDescription>
              Guardá la estructura de este tablero para reutilizarla en futuros proyectos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nombre de la plantilla</Label>
              <Input
                ref={templateNameInputRef}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={board.name}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Describe para qué sirve esta plantilla…"
                className="min-h-16"
              />
            </div>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={templateIncludeCards}
                  onChange={(e) => setTemplateIncludeCards(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Incluir tarjetas existentes</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={templatePublic}
                  onChange={(e) => setTemplatePublic(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Hacer pública (visible para otros usuarios)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTemplateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={isPending || !templateName.trim()}
            >
              {isPending ? "Guardando..." : "Guardar plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const BoardHeader = memo(BoardHeaderComponent);
