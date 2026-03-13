"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/app/actions/boards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBoardTheme, getRoleLabel } from "@/lib/utils";
import type { PendingInvitation } from "@/types";

type InvitationPanelProps = {
  invitations: PendingInvitation[];
};

export function InvitationPanel({ invitations }: InvitationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!invitations.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitaciones pendientes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aceptá o rechazá accesos compartidos desde otros tableros.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => {
          const theme = getBoardTheme(invitation.boardTheme);

          return (
            <div
              key={invitation.id}
              className="rounded-[24px] border border-border bg-background/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-3 rounded-full bg-gradient-to-r ${theme.gradientClass}`}
                    />
                    <p className="font-semibold">{invitation.boardName}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Invitó {invitation.invitedByName} · rol {getRoleLabel(invitation.role)}
                  </p>
                </div>
                <Badge className={theme.chipClass}>Pendiente</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  size="sm"
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
                      router.push(`/boards/${result.data?.boardId}`);
                      router.refresh();
                    })
                  }
                >
                  Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
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
                      router.refresh();
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
