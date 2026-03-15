"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { inviteMemberAction } from "@/app/actions/boards";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchBoardSnapshot } from "@/lib/board-snapshot-client";
import { useBoardStore } from "@/stores/board-store";

type InviteMemberDialogProps = {
  boardId: string;
  disabled?: boolean;
};

export function InviteMemberDialog({
  boardId,
  disabled = false,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [isPending, startTransition] = useTransition();
  const hydrateBoard = useBoardStore((state) => state.hydrateBoard);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextEmail = String(formData.get("email") ?? "");
    const nextRole = String(formData.get("role") ?? role);

    startTransition(async () => {
      const result = await inviteMemberAction({
        boardId,
        email: nextEmail,
        role: nextRole,
      });

      if (!result.ok) {
        toast.error(result.fieldErrors?.email?.[0] ?? result.message);
        return;
      }

      toast.success(result.message ?? "Invitación enviada.");

      if (!result.data?.emailSent && result.data?.inviteUrl) {
        try {
          await navigator.clipboard.writeText(result.data.inviteUrl);
          toast.info("Copié el enlace de invitación al portapapeles para compartirlo manualmente.");
        } catch {
          toast.info(`Compartí manualmente este enlace: ${result.data.inviteUrl}`);
        }
      }

      setEmail("");
      setRole("EDITOR");
      setOpen(false);

      try {
        hydrateBoard(await fetchBoardSnapshot(boardId));
      } catch {
        toast.error("No pudimos refrescar el tablero tras enviar la invitación.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={disabled}>
          Invitar miembro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invitar por email</DialogTitle>
          <DialogDescription>
            Definí el rol inicial para que el tablero quede compartido de forma segura.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colaborador@empresa.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <input type="hidden" name="role" value={role} />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="VIEWER">Lector</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar invitación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
