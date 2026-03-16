"use client";

import { Clock3, Sparkles, UserRoundPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/app/actions/boards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatRelativeDistance, getBoardTheme, getRoleLabel } from "@/lib/utils";
import type { PendingInvitation } from "@/types";

type InvitationPanelProps = {
  invitations: PendingInvitation[];
};

export function InvitationPanel({ invitations }: InvitationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(invitations);

  useEffect(() => {
    setItems(invitations);
  }, [invitations]);

  if (!items.length) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="relative border-b border-border/60 pb-5">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent" />
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              Acceso compartido
            </Badge>
            <div>
              <CardTitle>Invitaciones pendientes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Aceptá o rechazá accesos compartidos desde otros tableros.
              </p>
            </div>
          </div>

          <div className="glass-floating flex items-center gap-3 rounded-[24px] border border-border/70 px-4 py-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <UserRoundPlus className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                En espera
              </p>
              <p className="font-display text-2xl font-semibold">{items.length}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-5 xl:grid-cols-2">
        {items.map((invitation, index) => {
          const theme = getBoardTheme(invitation.boardTheme);

          return (
            <div
              key={invitation.id}
              className={cn(
                "animate-enter rounded-[28px] border border-border/70 p-5",
                "bg-gradient-to-br from-card via-card to-background/80",
                theme.surfaceClass,
              )}
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-3 rounded-full bg-gradient-to-r ${theme.gradientClass}`}
                    />
                    <p className="font-semibold">{invitation.boardName}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Invitó {invitation.invitedByName} con rol{" "}
                      {getRoleLabel(invitation.role)}.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1">
                        <Clock3 className="size-4" />
                        Expira {formatRelativeDistance(invitation.expiresAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge className={theme.chipClass}>Pendiente</Badge>
              </div>

              <div className="mt-5 rounded-[22px] border border-border/70 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="size-4 text-primary" />
                  Entrás con acceso inmediato al tablero y su contexto actual.
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="sm"
                  className="w-full sm:flex-1"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await acceptInvitationAction({
                        invitationId: invitation.id,
                      });

                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }

                      toast.success(result.message ?? "Invitación aceptada.");
                      setItems((current) =>
                        current.filter((item) => item.id !== invitation.id),
                      );
                      router.push(`/boards/${result.data?.boardId}`);
                    })
                  }
                >
                  Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full border border-border/70 bg-background/40 hover:bg-background/70 sm:flex-1"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await declineInvitationAction({
                        invitationId: invitation.id,
                      });

                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }

                      toast.success(result.message ?? "Invitación rechazada.");
                      setItems((current) =>
                        current.filter((item) => item.id !== invitation.id),
                      );
                    })
                  }
                >
                  Rechazar
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
