import { redirect } from "next/navigation";
import { passwordConfigured } from "@/lib/auth/account";
import { getDb } from "@/lib/db";
import { register } from "../login/actions";
import { PasswordForm } from "../login/PasswordForm";

export const dynamic = "force-dynamic";

// Open only until the first password is set; after that everyone is sent to the login page.
export default function RegisterPage() {
  if (passwordConfigured(getDb())) redirect("/login");
  return (
    <PasswordForm
      action={register}
      title="Buat akun"
      intro="Aplikasi ini untuk satu orang. Password yang kamu buat sekarang menjadi satu-satunya akses, dan halaman ini tertutup setelahnya."
      submitLabel="Buat akun"
      confirm
    />
  );
}
