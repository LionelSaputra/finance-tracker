import { redirect } from "next/navigation";
import { passwordConfigured } from "@/lib/auth/account";
import { getDb } from "@/lib/db";
import { login } from "./actions";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (!passwordConfigured(getDb())) redirect("/register");
  return <PasswordForm action={login} title="Finance" submitLabel="Masuk" />;
}
