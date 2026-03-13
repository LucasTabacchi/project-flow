import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth/session";
import { getProfilePageData } from "@/lib/data/dashboard";

export default async function ProfilePage() {
  const user = await requireUser();
  const data = await getProfilePageData(user.id);

  return <ProfileForm data={data} />;
}
