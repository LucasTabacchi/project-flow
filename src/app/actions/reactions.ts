"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, fromZodError, success, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import { ALLOWED_EMOJIS, type ReactionSummary } from "@/types/action-contracts";

const toggleReactionSchema = z.object({
  boardId: z.string().min(1),
  commentId: z.string().min(1),
  emoji: z.enum(ALLOWED_EMOJIS),
});

export async function toggleReactionAction(
  input: unknown,
): Promise<ActionResult<{ reactions: ReactionSummary[] }>> {
  const user = await requireUser();
  const parsed = toggleReactionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const membership = await getBoardMembership(parsed.data.boardId, user.id);
  if (!membership) return failure("No tenés acceso a este tablero.");

  // Verify comment belongs to board
  const comment = await prisma.cardComment.findFirst({
    where: { id: parsed.data.commentId, card: { boardId: parsed.data.boardId } },
    select: { id: true },
  });
  if (!comment) return failure("El comentario no existe.");

  const existing = await prisma.commentReaction.findUnique({
    where: {
      commentId_userId_emoji: {
        commentId: parsed.data.commentId,
        userId: user.id,
        emoji: parsed.data.emoji,
      },
    },
  });

  if (existing) {
    await prisma.commentReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentReaction.create({
      data: {
        commentId: parsed.data.commentId,
        userId: user.id,
        emoji: parsed.data.emoji,
      },
    });
  }

  const reactions = await getCommentReactions(parsed.data.commentId, user.id);
  revalidatePath(`/boards/${parsed.data.boardId}`);
  return success({ reactions });
}

export async function getCommentReactions(
  commentId: string,
  currentUserId: string,
): Promise<ReactionSummary[]> {
  const rows = await prisma.commentReaction.findMany({
    where: { commentId },
    select: {
      emoji: true,
      userId: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, { count: number; reactedByMe: boolean; userNames: string[] }>();
  for (const row of rows) {
    const existing = map.get(row.emoji) ?? { count: 0, reactedByMe: false, userNames: [] };
    existing.count += 1;
    existing.userNames.push(row.user.name);
    if (row.userId === currentUserId) existing.reactedByMe = true;
    map.set(row.emoji, existing);
  }

  return [...map.entries()].map(([emoji, data]) => ({ emoji, ...data }));
}
