"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChartColumnBig, KanbanSquare, MessageSquare, UserRoundCheck } from "lucide-react";

import { updateProfileAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/avatar";
import type { ProfilePageData } from "@/types";

type ProfileFormProps = {
  data: ProfilePageData;
};

const statItems = [
  {
    key: "boardCount",
    label: "Tableros",
    icon: KanbanSquare,
  },
  {
    key: "assignedCards",
    label: "Asignadas",
    icon: UserRoundCheck,
  },
  {
    key: "completedCards",
    label: "Completadas",
    icon: ChartColumnBig,
  },
  {
    key: "commentCount",
    label: "Comentarios",
    icon: MessageSquare,
  },
] as const;

export function ProfileForm({ data }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(data.user.name);
  const [avatarUrl, setAvatarUrl] = useState(data.user.avatarUrl ?? "");
  const [bio, setBio] = useState(data.user.bio ?? "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateProfileAction({
        name,
        avatarUrl,
        bio,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Perfil actualizado.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <UserAvatar name={name} src={avatarUrl} className="size-20" />
          <div>
            <CardTitle>{data.user.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{data.user.email}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Miembro desde {new Date(data.user.createdAt).toLocaleDateString("es-AR")}
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statItems.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.key}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {data.stats[item.key]}
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actualizar perfil</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cambiá tu nombre, bio y avatar para el resto del equipo.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-avatar">Avatar URL</Label>
                <Input
                  id="profile-avatar"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-40"
                placeholder="Contá tu foco o rol dentro del equipo."
              />
            </div>

            <div className="lg:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar perfil"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
