import { Suspense } from "react";

import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth/session";
import { getProfilePageData } from "@/lib/data/dashboard";

function ProfilePageFallback() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-border bg-card/70 p-6">
        <div className="flex items-center gap-4">
          <div className="size-20 animate-pulse rounded-[24px] bg-secondary" />
          <div className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-56 animate-pulse rounded bg-secondary/70" />
            <div className="h-4 w-40 animate-pulse rounded bg-secondary/70" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-border bg-card/70 p-6"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
            <div className="mt-4 h-10 w-16 animate-pulse rounded bg-secondary" />
          </div>
        ))}
      </div>

      <div className="rounded-[32px] border border-border bg-card/70 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-secondary/70" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <div className="h-11 animate-pulse rounded-2xl bg-secondary" />
            <div className="h-11 animate-pulse rounded-2xl bg-secondary" />
          </div>
          <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}

async function ProfilePageContent({
  userId,
}: {
  userId: string;
}) {
  const data = await getProfilePageData(userId);

  return <ProfileForm data={data} />;
}

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent userId={user.id} />
    </Suspense>
  );
}
