import { AuthProviders } from "@/components/providers/auth-providers";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthProviders>{children}</AuthProviders>;
}
