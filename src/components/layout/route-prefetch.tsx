"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type RoutePrefetchProps = {
  routes?: string[];
  boardIds?: string[];
};

export function RoutePrefetch({
  routes = [],
  boardIds = [],
}: RoutePrefetchProps) {
  const router = useRouter();

  useEffect(() => {
    routes.forEach((route) => {
      router.prefetch(route);
    });

    boardIds.forEach((boardId) => {
      router.prefetch(`/boards/${boardId}`);
    });
  }, [boardIds, router, routes]);

  return null;
}
