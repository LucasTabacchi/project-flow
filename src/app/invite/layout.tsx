import { AppProviders } from "@/components/providers/app-providers";

export default function InviteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppProviders>{children}</AppProviders>;
}
