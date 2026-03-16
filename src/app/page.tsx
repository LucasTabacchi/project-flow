import { AuthProviders } from "@/components/providers/auth-providers";
import { LoginScreen } from "@/components/auth/login-screen";

export default function HomePage() {
  return (
    <AuthProviders>
      <LoginScreen />
    </AuthProviders>
  );
}
