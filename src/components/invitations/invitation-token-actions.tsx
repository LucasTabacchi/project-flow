"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  acceptInvitationByTokenAction,
  declineInvitationByTokenAction,
} from "@/app/actions/boards";
import { Button } from "@/components/ui/button";

type InvitationTokenActionsProps = {
  boardId: string;
  token: string;
};

export function InvitationTokenActions({
  boardId,
  token,
}: InvitationTokenActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptInvitationByTokenAction({ token });

            if (!result.ok) {
              toast.error(result.message);
              return;
            }

            toast.success(result.message ?? "Invitación aceptada.");
            router.push(`/boards/${result.data?.boardId ?? boardId}`);
            router.refresh();
          })
        }
      >
        {isPending ? "Procesando..." : "Aceptar invitación"}
      </Button>
      <Button
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await declineInvitationByTokenAction({ token });

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
  );
}

