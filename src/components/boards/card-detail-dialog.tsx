"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Clock,
  History,
  LoaderCircle,
  Paperclip,
  Play,
  Send,
  Square,
  SquareCheckBig,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  addChecklistAction,
  addChecklistItemAction,
  addCommentAction,
  createAttachmentAction,
  deleteCardAction,
  deleteTimeEntryAction,
  getCardDetailAction,
  getCardHistoryAction,
  logTimeAction,
  toggleChecklistItemAction,
  updateCardAction,
} from "@/app/actions/cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  removeCardFromBoard,
  replaceCardInBoard,
} from "@/lib/board-local-updates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CARD_PRIORITIES,
  CARD_STATUSES,
  LABEL_COLOR_STYLES,
} from "@/lib/constants";
import {
  formatFullDate,
  formatRelativeDistance,
  getPriorityLabel,
  getStatusLabel,
  toDateInputValue,
} from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import type {
  BoardMemberView,
  BoardPresenceView,
  CardDetailView,
  CardHistoryItem,
  LabelView,
} from "@/types";
import { useBoardStore } from "@/stores/board-store";

type CardDetailDialogProps = {
  boardId: string;
  cardId: string | null;
  cardUpdatedAt: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: BoardMemberView[];
  presence: BoardPresenceView[];
  labels: LabelView[];
  canEdit: boolean;
  onActiveFieldChange?: (field: string | null) => void;
};

function haveSameValues(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const l = [...left].sort();
  const r = [...right].sort();
  return l.every((v, i) => v === r[i]);
}

function formatMinutes(total: number): string {
  if (total <= 0) return "0m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function timeProgress(tracked: number, estimated: number): number {
  if (!estimated) return 0;
  return Math.min(100, Math.round((tracked / estimated) * 100));
}

// ── Textarea con autocompletado @menciones ────────────────────────────────────

type MentionTextareaProps = {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  members: BoardMemberView[];
  className?: string;
};

function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  members,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<BoardMemberView[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  function detectMention(text: string, cursor: number) {
    const before = text.slice(0, cursor);
    const match = before.match(/@([\w\u00C0-\u024F]*)$/);
    if (!match) {
      setSuggestions([]);
      setMentionStart(null);
      return;
    }
    const query = match[1].toLowerCase();
    const start = cursor - match[0].length;
    setMentionStart(start);
    setSuggestions(
      members.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query),
      ),
    );
    setActiveIdx(0);
  }

  function applyMention(member: BoardMemberView) {
    if (mentionStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const firstName = member.name.split(" ")[0];
    const next = `${before}@${firstName} ${after}`;
    onChange(next);
    setSuggestions([]);
    setMentionStart(null);
    requestAnimationFrame(() => {
      const pos = mentionStart + firstName.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    detectMention(e.target.value, e.target.selectionStart);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(suggestions[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
        setMentionStart(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 z-50 mb-1 w-full max-h-44 overflow-auto rounded-2xl border border-border bg-popover shadow-lg">
          {suggestions.map((m, i) => (
            <li key={m.userId}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(m);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-sm transition ${
                  i === activeIdx ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <UserAvatar
                  name={m.name}
                  src={m.avatarUrl}
                  className="size-7 shrink-0"
                />
                <div className="min-w-0 text-left">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CardDetailDialog({
  boardId,
  cardId,
  cardUpdatedAt,
  open,
  onOpenChange,
  members,
  presence,
  labels,
  canEdit,
  onActiveFieldChange,
}: CardDetailDialogProps) {
  const mutateBoard = useBoardStore((state) => state.mutateBoard);
  const [detail, setDetail] = useState<CardDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("TODO");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");

  const [comment, setComment] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistItemDrafts, setChecklistItemDrafts] = useState<
    Record<string, string>
  >({});
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentUrlError, setAttachmentUrlError] = useState("");
  const [isAddingAttachment, startAttachmentTransition] = useTransition();

  // time tracking
  const [timerActive, setTimerActive] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [timerDisplay, setTimerDisplay] = useState("00:00");
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isLoggingTime, startLogTimeTransition] = useTransition();

  // history
  const [history, setHistory] = useState<CardHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyLoadedRef = useRef<string | null>(null);

  const remoteNoticeRef = useRef<string | null>(null);

  // Timer tick
  useEffect(() => {
    if (timerActive && timerStart !== null) {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const ss = (elapsed % 60).toString().padStart(2, "0");
        setTimerDisplay(`${mm}:${ss}`);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (!timerActive) setTimerDisplay("00:00");
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerActive, timerStart]);

  useEffect(() => {
    if (!open) {
      setTimerActive(false);
      setTimerStart(null);
    }
  }, [open]);

  function handleStartTimer() {
    setTimerActive(true);
    setTimerStart(Date.now());
  }

  function handleStopTimer() {
    if (!timerStart || !detail) return;
    const mins = Math.max(1, Math.round((Date.now() - timerStart) / 60000));
    setTimerActive(false);
    setTimerStart(null);
    startLogTimeTransition(async () => {
      const result = await logTimeAction({
        boardId,
        cardId: detail.id,
        minutes: mins,
        note: "Registrado con el timer",
      });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(`Timer detenido — ${formatMinutes(mins)} registrados.`);
      if (result.data) {
        syncDetail(result.data.detail);
        mutateBoard((board) =>
          replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
        );
      }
    });
  }

  async function handleLogManualTime() {
    if (!detail) return;
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins < 1) { toast.error("Ingresá una cantidad válida de minutos."); return; }
    startLogTimeTransition(async () => {
      const result = await logTimeAction({
        boardId,
        cardId: detail.id,
        minutes: mins,
        note: manualNote || undefined,
      });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message ?? "Tiempo registrado.");
      setManualMinutes("");
      setManualNote("");
      if (result.data) {
        syncDetail(result.data.detail);
        mutateBoard((board) =>
          replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
        );
      }
    });
  }

  async function handleDeleteTimeEntry(entryId: string) {
    if (!detail) return;
    const result = await deleteTimeEntryAction({ boardId, cardId: detail.id, entryId });
    if (!result.ok) { toast.error(result.message); return; }
    toast.success(result.message ?? "Entrada eliminada.");
    if (result.data) {
      syncDetail(result.data.detail);
      mutateBoard((board) =>
        replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
      );
    }
  }

  async function loadHistory() {
    if (!cardId || historyLoadedRef.current === cardId) return;
    setHistoryLoading(true);
    const result = await getCardHistoryAction(boardId, cardId);
    setHistoryLoading(false);
    if (result.ok && result.data) {
      setHistory(result.data);
      historyLoadedRef.current = cardId;
    }
  }

  function syncDetail(nextDetail: CardDetailView) {
    setDetail(nextDetail);
    setTitle(nextDetail.title);
    setDescription(nextDetail.description ?? "");
    setDueDate(toDateInputValue(nextDetail.dueDate));
    setPriority(nextDetail.priority);
    setStatus(nextDetail.status);
    setSelectedLabels(nextDetail.labels.map((l) => l.id));
    setSelectedAssignees(nextDetail.assignees.map((a) => a.userId));
    setEstimatedMinutes(
      nextDetail.estimatedMinutes != null ? String(nextDetail.estimatedMinutes) : "",
    );
  }

  function resetState() {
    setDetail(null);
    setComment("");
    setChecklistTitle("");
    setAttachmentName("");
    setAttachmentUrl("");
    setAttachmentUrlError("");
    setChecklistItemDrafts({});
    setHistory([]);
    historyLoadedRef.current = null;
    setManualMinutes("");
    setManualNote("");
    setTimerActive(false);
    setTimerStart(null);
    onActiveFieldChange?.(null);
  }

  const refreshDetail = useCallback(
    async (currentCardId: string) => {
      const result = await getCardDetailAction(boardId, currentCardId);
      if (!result.ok || !result.data) { toast.error(result.message); return null; }
      return result.data;
    },
    [boardId],
  );

  const hasUnsavedCardChanges = useMemo(() => {
    if (!detail) return false;
    const estMins = estimatedMinutes === "" ? null : parseInt(estimatedMinutes, 10) || null;
    return (
      title !== detail.title ||
      description !== (detail.description ?? "") ||
      dueDate !== toDateInputValue(detail.dueDate) ||
      priority !== detail.priority ||
      status !== detail.status ||
      estMins !== detail.estimatedMinutes ||
      !haveSameValues(selectedLabels, detail.labels.map((l) => l.id)) ||
      !haveSameValues(selectedAssignees, detail.assignees.map((a) => a.userId))
    );
  }, [description, detail, dueDate, estimatedMinutes, priority, selectedAssignees, selectedLabels, status, title]);

  const activeViewers = useMemo(() => {
    if (!detail) return [];
    return presence.filter((e) => e.activeCardId === detail.id);
  }, [detail, presence]);

  function getFieldEditors(field: string) {
    return activeViewers.filter((v) => v.activeField === field);
  }

  function FieldEditorBadge({ field }: { field: string }) {
    const editors = getFieldEditors(field);
    if (!editors.length) return null;
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {editors.map((e) => e.name.split(" ")[0]).join(", ")} editando
      </span>
    );
  }

  useEffect(() => {
    if (!open || !cardId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const nextDetail = await refreshDetail(cardId);
      if (cancelled) return;
      setLoading(false);
      if (nextDetail) syncDetail(nextDetail);
    })();
    return () => { cancelled = true; };
  }, [boardId, cardId, open, refreshDetail]);

  useEffect(() => {
    if (!open || !cardId) { remoteNoticeRef.current = null; return; }
    if (!cardUpdatedAt) {
      if (detail) { toast.error("La tarjeta fue eliminada en otra sesión."); onOpenChange(false); }
      return;
    }
    if (!detail || cardUpdatedAt === detail.updatedAt) { remoteNoticeRef.current = null; return; }
    if (hasUnsavedCardChanges || isPending) {
      if (remoteNoticeRef.current !== cardUpdatedAt) {
        remoteNoticeRef.current = cardUpdatedAt;
        toast.error("La tarjeta cambió en otra sesión. Guardá tus cambios y volvé a abrirla.");
      }
      return;
    }
    let cancelled = false;
    void (async () => {
      const nextDetail = await refreshDetail(cardId);
      if (cancelled || !nextDetail) return;
      syncDetail(nextDetail);
      remoteNoticeRef.current = null;
    })();
    return () => { cancelled = true; };
  }, [cardId, cardUpdatedAt, detail, hasUnsavedCardChanges, isPending, onOpenChange, open, refreshDetail]);

  function toggleSelection(values: string[], value: string) {
    return values.includes(value)
      ? values.filter((c) => c !== value)
      : [...values, value];
  }

  function handleSaveCard() {
    if (!detail) return;
    const estMins = estimatedMinutes === "" ? null : parseInt(estimatedMinutes, 10) || null;
    startTransition(async () => {
      const result = await updateCardAction({
        boardId,
        cardId: detail.id,
        title,
        description,
        dueDate,
        priority,
        status,
        labelIds: selectedLabels,
        assigneeIds: selectedAssignees,
        estimatedMinutes: estMins,
      });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message ?? "Tarjeta actualizada.");
      if (!result.data) return;
      syncDetail(result.data.detail);
      mutateBoard((board) =>
        replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
      );
    });
  }

  function handleDeleteCard() {
    if (!detail) return;
    startTransition(async () => {
      const result = await deleteCardAction({ boardId, cardId: detail.id });
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(result.message ?? "Tarjeta eliminada.");
      if (result.data) {
        mutateBoard((board) =>
          removeCardFromBoard(board, result.data!.cardId, result.data!.boardUpdatedAt),
        );
      }
      onOpenChange(false);
    });
  }

  async function handleAddComment() {
    if (!detail || !comment.trim()) return;
    const result = await addCommentAction({ boardId, cardId: detail.id, body: comment });
    if (!result.ok) { toast.error(result.message); return; }
    setComment("");
    toast.success(result.message ?? "Comentario agregado.");
    if (!result.data) return;
    syncDetail(result.data.detail);
    mutateBoard((board) =>
      replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
    );
  }

  async function handleAddChecklist() {
    if (!detail || !checklistTitle.trim()) return;
    const result = await addChecklistAction({ boardId, cardId: detail.id, title: checklistTitle });
    if (!result.ok) { toast.error(result.message); return; }
    setChecklistTitle("");
    toast.success(result.message ?? "Checklist agregado.");
    if (!result.data) return;
    syncDetail(result.data.detail);
    mutateBoard((board) =>
      replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
    );
  }

  async function handleAddChecklistItem(checklistId: string) {
    const t = checklistItemDrafts[checklistId]?.trim();
    if (!t || !detail) return;
    const result = await addChecklistItemAction({ boardId, checklistId, title: t });
    if (!result.ok) { toast.error(result.message); return; }
    setChecklistItemDrafts((c) => ({ ...c, [checklistId]: "" }));
    if (!result.data) return;
    syncDetail(result.data.detail);
    mutateBoard((board) =>
      replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
    );
  }

  async function handleToggleChecklist(itemId: string, isCompleted: boolean) {
    const result = await toggleChecklistItemAction({ boardId, itemId, isCompleted });
    if (!result.ok) { toast.error(result.message); return; }
    if (!result.data) return;
    syncDetail(result.data.detail);
    mutateBoard((board) =>
      replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
    );
  }

  async function handleAddAttachment() {
    if (!detail || !attachmentName.trim() || !attachmentUrl.trim()) return;
    try {
      new URL(attachmentUrl.trim());
      setAttachmentUrlError("");
    } catch {
      setAttachmentUrlError("Ingresá una URL válida (debe incluir https://).");
      return;
    }
    startAttachmentTransition(async () => {
      const result = await createAttachmentAction({
        boardId,
        cardId: detail.id,
        name: attachmentName,
        url: attachmentUrl,
      });
      if (!result.ok) { toast.error(result.message); return; }
      setAttachmentName("");
      setAttachmentUrl("");
      setAttachmentUrlError("");
      toast.success(result.message ?? "Adjunto agregado.");
      if (!result.data) return;
      syncDetail(result.data.detail);
      mutateBoard((board) =>
        replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
      );
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetState();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[100dvh] w-[min(96vw,72rem)] max-w-6xl overflow-hidden p-0 sm:max-h-[92vh] sm:w-[min(94vw,72rem)]">
        <div className="grid h-full min-h-0 grid-cols-1 lg:min-h-[72vh] lg:grid-cols-[1.05fr_0.95fr]">

          {/* ── Left panel ─────────────────────────────────────────────────── */}
          <div className="border-b border-border/60 p-4 sm:p-6 lg:border-r lg:border-b-0">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl">
                {detail?.title || "Detalle de tarjeta"}
              </DialogTitle>
              <DialogDescription>
                {detail
                  ? `Creada ${formatRelativeDistance(detail.createdAt)} por ${detail.createdBy.name}`
                  : "Cargando información de la tarjeta."}
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex h-full items-center justify-center py-20">
                <LoaderCircle className="size-8 animate-spin text-primary" />
              </div>
            ) : detail ? (
              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="h-auto w-full flex-wrap justify-start">
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="checklists">Checklist</TabsTrigger>
                  <TabsTrigger value="activity">Actividad</TabsTrigger>
                  <TabsTrigger value="history" onClick={loadHistory}>
                    <History className="mr-1 size-3.5" />
                    Historial
                  </TabsTrigger>
                  <TabsTrigger value="time">
                    <Timer className="mr-1 size-3.5" />
                    Tiempo
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="mt-4 h-[min(52vh,32rem)] pr-2 sm:h-[58vh] sm:pr-4">

                  {/* ── Overview ──────────────────────────────────────────── */}
                  <TabsContent value="overview" className="space-y-5 pr-2">
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        Título <FieldEditorBadge field="title" />
                      </Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={!canEdit}
                        onFocus={() => onActiveFieldChange?.("title")}
                        onBlur={() => onActiveFieldChange?.(null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center">
                        Descripción <FieldEditorBadge field="description" />
                      </Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!canEdit}
                        onFocus={() => onActiveFieldChange?.("description")}
                        onBlur={() => onActiveFieldChange?.(null)}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select value={status} onValueChange={setStatus} disabled={!canEdit}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CARD_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select value={priority} onValueChange={setPriority} disabled={!canEdit}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CARD_PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p}>{getPriorityLabel(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center">
                          Fecha límite <FieldEditorBadge field="dueDate" />
                        </Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          disabled={!canEdit}
                          onFocus={() => onActiveFieldChange?.("dueDate")}
                          onBlur={() => onActiveFieldChange?.(null)}
                        />
                      </div>
                    </div>

                    {/* Tiempo estimado */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="size-3.5 text-muted-foreground" />
                        Tiempo estimado (minutos)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ej: 120 → 2h"
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(e.target.value)}
                        disabled={!canEdit}
                      />
                      {estimatedMinutes && !isNaN(parseInt(estimatedMinutes)) && parseInt(estimatedMinutes) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          = {formatMinutes(parseInt(estimatedMinutes))}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label>Etiquetas</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {labels.map((label) => (
                          <button
                            key={label.id}
                            type="button"
                            disabled={!canEdit}
                            onClick={() =>
                              setSelectedLabels((c) => toggleSelection(c, label.id))
                            }
                            className={`rounded-[20px] border border-border px-3 py-2 text-left text-sm transition ${
                              selectedLabels.includes(label.id)
                                ? LABEL_COLOR_STYLES[label.color].soft
                                : "bg-background/60"
                            }`}
                          >
                            {label.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Responsables</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {members.map((member) => (
                          <label
                            key={member.userId}
                            className="flex items-center gap-3 rounded-[20px] border border-border bg-background/60 px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={selectedAssignees.includes(member.userId)}
                              disabled={!canEdit}
                              onCheckedChange={() =>
                                setSelectedAssignees((c) => toggleSelection(c, member.userId))
                              }
                            />
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-3 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {detail.labels.map((label) => (
                          <Badge key={label.id} className={LABEL_COLOR_STYLES[label.color].soft}>
                            {label.name}
                          </Badge>
                        ))}
                      </div>
                      {canEdit ? (
                        <Button
                          onClick={handleSaveCard}
                          disabled={isPending || !hasUnsavedCardChanges}
                        >
                          {isPending ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      ) : null}
                    </div>
                  </TabsContent>

                  {/* ── Checklists ─────────────────────────────────────── */}
                  <TabsContent value="checklists" className="space-y-5 pr-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={checklistTitle}
                        onChange={(e) => setChecklistTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklist(); } }}
                        placeholder="Nuevo checklist"
                        disabled={!canEdit}
                      />
                      <Button type="button" onClick={handleAddChecklist} disabled={!canEdit || !checklistTitle.trim()}>
                        <SquareCheckBig className="size-4" />
                        Agregar
                      </Button>
                    </div>
                    {detail.checklists.map((checklist) => (
                      <div key={checklist.id} className="rounded-[28px] border border-border bg-background/60 p-4">
                        <div className="mb-3">
                          <h4 className="font-display text-lg font-semibold">{checklist.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {checklist.items.filter((i) => i.isCompleted).length}/{checklist.items.length} completados
                          </p>
                        </div>
                        <div className="space-y-3">
                          {checklist.items.map((item) => (
                            <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 px-3 py-3">
                              <Checkbox
                                checked={item.isCompleted}
                                disabled={!canEdit}
                                onCheckedChange={(checked) => handleToggleChecklist(item.id, Boolean(checked))}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{item.title}</p>
                                {item.completedAt ? (
                                  <p className="text-xs text-muted-foreground">
                                    Completado {formatRelativeDistance(item.completedAt)}
                                  </p>
                                ) : null}
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={checklistItemDrafts[checklist.id] ?? ""}
                            onChange={(e) => setChecklistItemDrafts((c) => ({ ...c, [checklist.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistItem(checklist.id); } }}
                            placeholder="Nuevo item"
                            disabled={!canEdit}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={!canEdit || !checklistItemDrafts[checklist.id]?.trim()}
                            onClick={() => handleAddChecklistItem(checklist.id)}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* ── Activity (adjuntos + comentarios con @menciones) ── */}
                  <TabsContent value="activity" className="space-y-5 pr-2">
                    {/* Adjuntos */}
                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Paperclip className="size-4 text-primary" />
                        <h4 className="font-display text-lg font-semibold">Adjuntos</h4>
                        {detail.attachments.length > 0 && (
                          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                            {detail.attachments.length}
                          </span>
                        )}
                      </div>
                      {detail.attachments.length > 0 ? (
                        <div className="mb-3 space-y-2">
                          {detail.attachments.map((a) => (
                            <a
                              key={a.id}
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-3 py-3 text-sm transition hover:bg-card hover:border-primary/20"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{a.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{a.url}</p>
                              </div>
                              <svg className="size-3.5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mb-3 text-sm text-muted-foreground">Todavía no hay adjuntos en esta tarjeta.</p>
                      )}
                      {canEdit ? (
                        <div className="space-y-2 border-t border-border/60 pt-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              value={attachmentName}
                              onChange={(e) => setAttachmentName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAttachment(); } }}
                              placeholder="Nombre del adjunto"
                            />
                            <div className="space-y-1">
                              <Input
                                value={attachmentUrl}
                                onChange={(e) => { setAttachmentUrl(e.target.value); if (attachmentUrlError) setAttachmentUrlError(""); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAttachment(); } }}
                                placeholder="https://..."
                                className={attachmentUrlError ? "border-destructive/60 focus-visible:ring-destructive/30" : ""}
                              />
                              {attachmentUrlError && <p className="text-xs text-destructive">{attachmentUrlError}</p>}
                            </div>
                          </div>
                          <Button
                            type="button"
                            className="w-full sm:w-auto"
                            onClick={handleAddAttachment}
                            disabled={isAddingAttachment || !attachmentName.trim() || !attachmentUrl.trim()}
                          >
                            {isAddingAttachment ? (
                              <><LoaderCircle className="size-4 animate-spin" /> Agregando...</>
                            ) : (
                              <><Paperclip className="size-4" /> Agregar adjunto</>
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {/* Comentarios con @menciones */}
                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <h4 className="font-display text-lg font-semibold">Comentarios</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Escribí <span className="font-medium text-foreground">@nombre</span> para mencionar a un miembro del tablero.
                      </p>
                      <div className="mt-3 space-y-3">
                        {detail.comments.map((entry) => (
                          <div key={entry.id} className="rounded-2xl border border-border bg-card/70 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <UserAvatar name={entry.author.name} src={entry.author.avatarUrl} className="size-7" />
                                <p className="font-medium">{entry.author.name}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeDistance(entry.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                              {entry.body.split(/(@[\w\u00C0-\u024F]+)/g).map((part, i) =>
                                part.startsWith("@") ? (
                                  <span key={i} className="rounded px-0.5 font-medium text-primary">{part}</span>
                                ) : (
                                  part
                                ),
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <MentionTextarea
                            value={comment}
                            onChange={setComment}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                handleAddComment();
                              }
                            }}
                            placeholder="Agregar comentario… (Ctrl+Enter para enviar)"
                            members={members}
                            className="min-h-20"
                          />
                          <Button type="button" onClick={handleAddComment} disabled={!comment.trim()}>
                            <Send className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>

                  {/* ── Historial ──────────────────────────────────────── */}
                  <TabsContent value="history" className="space-y-3 pr-2">
                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <History className="size-4 text-primary" />
                        <h4 className="font-display text-lg font-semibold">Historial de cambios</h4>
                      </div>
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <LoaderCircle className="size-6 animate-spin text-primary" />
                        </div>
                      ) : history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No hay actividad registrada para esta tarjeta todavía.
                        </p>
                      ) : (
                        <ol className="relative space-y-0 border-l border-border/60 pl-5">
                          {history.map((item) => (
                            <li key={item.id} className="pb-4 last:pb-0">
                              <div className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border border-border bg-background" />
                              <div className="flex items-start gap-3">
                                <UserAvatar
                                  name={item.user.name}
                                  src={item.user.avatarUrl}
                                  className="size-7 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm">
                                    <span className="font-medium">{item.user.name}</span>{" "}
                                    <span className="text-muted-foreground">{item.summary}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatRelativeDistance(item.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Tiempo ────────────────────────────────────────── */}
                  <TabsContent value="time" className="space-y-4 pr-2">
                    {/* Resumen */}
                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        <h4 className="font-display text-lg font-semibold">Resumen</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-center">
                          <p className="text-xs text-muted-foreground">Registrado</p>
                          <p className="mt-1 text-2xl font-bold tabular-nums">
                            {formatMinutes(detail.trackedMinutes)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-center">
                          <p className="text-xs text-muted-foreground">Estimado</p>
                          <p className="mt-1 text-2xl font-bold tabular-nums">
                            {detail.estimatedMinutes ? formatMinutes(detail.estimatedMinutes) : "—"}
                          </p>
                        </div>
                      </div>
                      {detail.estimatedMinutes ? (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progreso</span>
                            <span>{timeProgress(detail.trackedMinutes, detail.estimatedMinutes)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full transition-all ${
                                timeProgress(detail.trackedMinutes, detail.estimatedMinutes) >= 100
                                  ? "bg-destructive"
                                  : "bg-primary"
                              }`}
                              style={{ width: `${timeProgress(detail.trackedMinutes, detail.estimatedMinutes)}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Timer */}
                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <h4 className="mb-3 font-semibold">Timer</h4>
                      <div className="flex items-center gap-4">
                        <span className={`font-mono text-3xl tabular-nums ${timerActive ? "text-primary" : "text-muted-foreground"}`}>
                          {timerDisplay}
                        </span>
                        {timerActive ? (
                          <Button variant="destructive" size="sm" onClick={handleStopTimer} disabled={isLoggingTime}>
                            <Square className="size-4" />
                            Detener y guardar
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={handleStartTimer} disabled={!canEdit || isLoggingTime}>
                            <Play className="size-4" />
                            Iniciar timer
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Registro manual */}
                    {canEdit ? (
                      <div className="rounded-[28px] border border-border bg-background/60 p-4">
                        <h4 className="mb-3 font-semibold">Registrar manualmente</h4>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            type="number"
                            min={1}
                            max={1440}
                            placeholder="Minutos (ej: 90)"
                            value={manualMinutes}
                            onChange={(e) => setManualMinutes(e.target.value)}
                            className="sm:w-36"
                          />
                          <Input
                            placeholder="Nota opcional"
                            value={manualNote}
                            onChange={(e) => setManualNote(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLogManualTime(); } }}
                          />
                          <Button type="button" onClick={handleLogManualTime} disabled={isLoggingTime || !manualMinutes}>
                            {isLoggingTime
                              ? <LoaderCircle className="size-4 animate-spin" />
                              : <Clock className="size-4" />}
                            Registrar
                          </Button>
                        </div>
                        {manualMinutes && !isNaN(parseInt(manualMinutes)) && parseInt(manualMinutes) > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            = {formatMinutes(parseInt(manualMinutes))}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {/* Log de entradas */}
                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <h4 className="mb-3 font-semibold">
                        Entradas registradas
                        {detail.timeEntries.length > 0 && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({detail.timeEntries.length})
                          </span>
                        )}
                      </h4>
                      {detail.timeEntries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Todavía no hay tiempo registrado en esta tarjeta.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.timeEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-3 py-2.5 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <UserAvatar name={entry.user.name} src={entry.user.avatarUrl} className="size-7 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium tabular-nums">{formatMinutes(entry.minutes)}</p>
                                  {entry.note && (
                                    <p className="truncate text-xs text-muted-foreground">{entry.note}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {entry.user.name} · {formatRelativeDistance(entry.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTimeEntry(entry.id)}
                                  className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                </ScrollArea>
              </Tabs>
            ) : null}
          </div>

          {/* ── Right panel ────────────────────────────────────────────────── */}
          <aside className="bg-card/70 p-4 sm:p-6">
            {detail ? (
              <div className="space-y-5">
                <div className="rounded-[28px] border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Metadatos
                  </p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Creada por</p>
                      <p className="font-medium">{detail.createdBy.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Creación</p>
                      <p className="font-medium">{formatFullDate(detail.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Última actualización</p>
                      <p className="font-medium">{formatRelativeDistance(detail.updatedAt)}</p>
                    </div>
                    {(detail.estimatedMinutes || detail.trackedMinutes > 0) && (
                      <div className="pt-2 border-t border-border/60">
                        <p className="text-muted-foreground">Tiempo</p>
                        <p className="font-medium tabular-nums">
                          {formatMinutes(detail.trackedMinutes)}
                          {detail.estimatedMinutes
                            ? ` / ${formatMinutes(detail.estimatedMinutes)}`
                            : ""}
                        </p>
                        {detail.estimatedMinutes ? (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full ${
                                timeProgress(detail.trackedMinutes, detail.estimatedMinutes) >= 100
                                  ? "bg-destructive"
                                  : "bg-primary"
                              }`}
                              style={{ width: `${timeProgress(detail.trackedMinutes, detail.estimatedMinutes)}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-border bg-background/70 p-4">
                  <p className="text-sm font-semibold">Responsables</p>
                  <div className="mt-3 space-y-2">
                    {detail.assignees.length ? (
                      detail.assignees.map((a) => (
                        <div key={a.userId} className="rounded-2xl border border-border px-3 py-2 text-sm">
                          <p className="font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Todavía no hay responsables asignados.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-border bg-background/70 p-4">
                  <p className="text-sm font-semibold">Viendo esta tarjeta</p>
                  <div className="mt-3 space-y-2">
                    {activeViewers.length ? (
                      activeViewers.map((viewer) => (
                        <div
                          key={viewer.userId}
                          className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm"
                        >
                          <UserAvatar name={viewer.name} src={viewer.avatarUrl} className="size-9" />
                          <div className="min-w-0">
                            <p className="font-medium">{viewer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {viewer.sessionCount > 1
                                ? `${viewer.sessionCount} sesiones abiertas`
                                : "Online en esta tarjeta"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay presencia activa en esta tarjeta.
                      </p>
                    )}
                  </div>
                </div>

                {canEdit ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isPending}
                    onClick={handleDeleteCard}
                  >
                    <Trash2 className="size-4" />
                    Eliminar tarjeta
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <LoaderCircle className="size-8 animate-spin text-primary" />
              </div>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
