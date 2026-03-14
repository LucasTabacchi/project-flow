"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const APP_ROUTES = ["/dashboard", "/search", "/calendar", "/profile"];

type RoutePrefetchProps = {
  boardIds?: string[];
};

export function RoutePrefetch({ boardIds = [] }: RoutePrefetchProps) {
  const router = useRouter();

  useEffect(() => {
    APP_ROUTES.forEach((route) => {
      router.prefetch(route);
    });

    boardIds.forEach((boardId) => {
      router.prefetch(`/boards/${boardId}`);
    });
  }, [boardIds, router]);

  return null;
}
