"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Paperclip, Send, SquareCheckBig, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addChecklistAction,
  addChecklistItemAction,
  addCommentAction,
  createAttachmentAction,
  deleteCardAction,
  getCardDetailAction,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CARD_PRIORITIES, CARD_STATUSES, LABEL_COLOR_STYLES } from "@/lib/constants";
import {
  formatFullDate,
  formatRelativeDistance,
  getPriorityLabel,
  getStatusLabel,
  toDateInputValue,
} from "@/lib/utils";
import type { BoardMemberView, CardDetailView, LabelView } from "@/types";

type CardDetailDialogProps = {
  boardId: string;
  cardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: BoardMemberView[];
  labels: LabelView[];
  canEdit: boolean;
};

export function CardDetailDialog({
  boardId,
  cardId,
  open,
  onOpenChange,
  members,
  labels,
  canEdit,
}: CardDetailDialogProps) {
  const router = useRouter();
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
  const [comment, setComment] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistItemDrafts, setChecklistItemDrafts] = useState<
    Record<string, string>
  >({});
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  function syncDetail(nextDetail: CardDetailView) {
    setDetail(nextDetail);
    setTitle(nextDetail.title);
    setDescription(nextDetail.description ?? "");
    setDueDate(toDateInputValue(nextDetail.dueDate));
    setPriority(nextDetail.priority);
    setStatus(nextDetail.status);
    setSelectedLabels(nextDetail.labels.map((label) => label.id));
    setSelectedAssignees(nextDetail.assignees.map((assignee) => assignee.userId));
  }

  function resetState() {
    setDetail(null);
    setComment("");
    setChecklistTitle("");
    setAttachmentName("");
    setAttachmentUrl("");
    setChecklistItemDrafts({});
  }

  const refreshDetail = useCallback(async (currentCardId: string) => {
    const result = await getCardDetailAction(boardId, currentCardId);

    if (!result.ok || !result.data) {
      toast.error(result.message);
      return null;
    }

    return result.data;
  }, [boardId]);

  useEffect(() => {
    if (!open || !cardId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      const nextDetail = await refreshDetail(cardId);

      if (cancelled) {
        return;
      }

      setLoading(false);

      if (nextDetail) {
        syncDetail(nextDetail);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boardId, cardId, open, refreshDetail]);

  function toggleSelection(values: string[], value: string) {
    return values.includes(value)
      ? values.filter((current) => current !== value)
      : [...values, value];
  }

  function handleSaveCard() {
    if (!detail) {
      return;
    }

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
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Tarjeta actualizada.");
      const nextDetail = await refreshDetail(detail.id);
      if (nextDetail) {
        syncDetail(nextDetail);
      }
      router.refresh();
    });
  }

  function handleDeleteCard() {
    if (!detail) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCardAction({
        boardId,
        cardId: detail.id,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Tarjeta eliminada.");
      onOpenChange(false);
      router.refresh();
    });
  }

  async function handleAddComment() {
    if (!detail || !comment.trim()) {
      return;
    }

    const result = await addCommentAction({
      boardId,
      cardId: detail.id,
      body: comment,
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setComment("");
    toast.success(result.message ?? "Comentario agregado.");
    const nextDetail = await refreshDetail(detail.id);
    if (nextDetail) {
      syncDetail(nextDetail);
    }
    router.refresh();
  }

  async function handleAddChecklist() {
    if (!detail || !checklistTitle.trim()) {
      return;
    }

    const result = await addChecklistAction({
      boardId,
      cardId: detail.id,
      title: checklistTitle,
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setChecklistTitle("");
    toast.success(result.message ?? "Checklist agregado.");
    const nextDetail = await refreshDetail(detail.id);
    if (nextDetail) {
      syncDetail(nextDetail);
    }
    router.refresh();
  }

  async function handleAddChecklistItem(checklistId: string) {
    const title = checklistItemDrafts[checklistId]?.trim();

    if (!title || !detail) {
      return;
    }

    const result = await addChecklistItemAction({
      boardId,
      checklistId,
      title,
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setChecklistItemDrafts((current) => ({
      ...current,
      [checklistId]: "",
    }));
    const nextDetail = await refreshDetail(detail.id);
    if (nextDetail) {
      syncDetail(nextDetail);
    }
    router.refresh();
  }

  async function handleToggleChecklist(itemId: string, isCompleted: boolean) {
    const result = await toggleChecklistItemAction({
      boardId,
      itemId,
      isCompleted,
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    if (detail) {
      const nextDetail = await refreshDetail(detail.id);
      if (nextDetail) {
        syncDetail(nextDetail);
      }
    }
    router.refresh();
  }

  async function handleAddAttachment() {
    if (!detail || !attachmentName.trim() || !attachmentUrl.trim()) {
      return;
    }

    const result = await createAttachmentAction({
      boardId,
      cardId: detail.id,
      name: attachmentName,
      url: attachmentUrl,
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setAttachmentName("");
    setAttachmentUrl("");
    toast.success(result.message ?? "Adjunto agregado.");
    const nextDetail = await refreshDetail(detail.id);
    if (nextDetail) {
      syncDetail(nextDetail);
    }
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetState();
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
        <div className="grid h-full min-h-[72vh] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-border/60 p-6 lg:border-r lg:border-b-0">
            <DialogHeader>
              <DialogTitle className="text-2xl">
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
                <TabsList>
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="checklists">Checklist</TabsTrigger>
                  <TabsTrigger value="activity">Actividad</TabsTrigger>
                </TabsList>

                <ScrollArea className="mt-4 h-[58vh] pr-4">
                  <TabsContent value="overview" className="space-y-5 pr-2">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                          value={status}
                          onValueChange={setStatus}
                          disabled={!canEdit}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CARD_STATUSES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {getStatusLabel(item)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select
                          value={priority}
                          onValueChange={setPriority}
                          disabled={!canEdit}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CARD_PRIORITIES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {getPriorityLabel(item)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha límite</Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
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
                              setSelectedLabels((current) =>
                                toggleSelection(current, label.id),
                              )
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
                                setSelectedAssignees((current) =>
                                  toggleSelection(current, member.userId),
                                )
                              }
                            />
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
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
                        <Button onClick={handleSaveCard} disabled={isPending}>
                          {isPending ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="checklists" className="space-y-5 pr-2">
                    <div className="flex gap-2">
                      <Input
                        value={checklistTitle}
                        onChange={(event) => setChecklistTitle(event.target.value)}
                        placeholder="Nuevo checklist"
                        disabled={!canEdit}
                      />
                      <Button
                        type="button"
                        onClick={handleAddChecklist}
                        disabled={!canEdit}
                      >
                        <SquareCheckBig className="size-4" />
                        Agregar
                      </Button>
                    </div>

                    {detail.checklists.map((checklist) => (
                      <div
                        key={checklist.id}
                        className="rounded-[28px] border border-border bg-background/60 p-4"
                      >
                        <div className="mb-3">
                          <h4 className="font-display text-lg font-semibold">
                            {checklist.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {checklist.items.filter((item) => item.isCompleted).length}/
                            {checklist.items.length} completados
                          </p>
                        </div>
                        <div className="space-y-3">
                          {checklist.items.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 px-3 py-3"
                            >
                              <Checkbox
                                checked={item.isCompleted}
                                disabled={!canEdit}
                                onCheckedChange={(checked) =>
                                  handleToggleChecklist(item.id, Boolean(checked))
                                }
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

                        <div className="mt-3 flex gap-2">
                          <Input
                            value={checklistItemDrafts[checklist.id] ?? ""}
                            onChange={(event) =>
                              setChecklistItemDrafts((current) => ({
                                ...current,
                                [checklist.id]: event.target.value,
                              }))
                            }
                            placeholder="Nuevo item"
                            disabled={!canEdit}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={!canEdit}
                            onClick={() => handleAddChecklistItem(checklist.id)}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-5 pr-2">
                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Paperclip className="size-4 text-primary" />
                        <h4 className="font-display text-lg font-semibold">Adjuntos</h4>
                      </div>
                      <div className="space-y-2">
                        {detail.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-2xl border border-border bg-card/70 px-3 py-3 text-sm transition hover:bg-card"
                          >
                            <p className="font-medium">{attachment.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {attachment.url}
                            </p>
                          </a>
                        ))}
                      </div>
                      {canEdit ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            value={attachmentName}
                            onChange={(event) => setAttachmentName(event.target.value)}
                            placeholder="Nombre del adjunto"
                          />
                          <Input
                            value={attachmentUrl}
                            onChange={(event) => setAttachmentUrl(event.target.value)}
                            placeholder="https://..."
                          />
                          <Button type="button" onClick={handleAddAttachment}>
                            Agregar
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[28px] border border-border bg-background/60 p-4">
                      <h4 className="font-display text-lg font-semibold">Comentarios</h4>
                      <div className="mt-3 space-y-3">
                        {detail.comments.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-2xl border border-border bg-card/70 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{entry.author.name}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeDistance(entry.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{entry.body}</p>
                          </div>
                        ))}
                      </div>
                      {canEdit ? (
                        <div className="mt-3 flex gap-2">
                          <Textarea
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            placeholder="Agregar comentario"
                            className="min-h-20"
                          />
                          <Button type="button" onClick={handleAddComment}>
                            <Send className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            ) : null}
          </div>

          <aside className="bg-card/70 p-6">
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
                      <p className="font-medium">
                        {formatRelativeDistance(detail.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border bg-background/70 p-4">
                  <p className="text-sm font-semibold">Responsables</p>
                  <div className="mt-3 space-y-2">
                    {detail.assignees.length ? (
                      detail.assignees.map((assignee) => (
                        <div
                          key={assignee.userId}
                          className="rounded-2xl border border-border px-3 py-2 text-sm"
                        >
                          <p className="font-medium">{assignee.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignee.email}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Todavía no hay responsables asignados.
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
