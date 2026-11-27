"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { clearLoginFailures, clientIp, isLoginBlocked, recordLoginFailure } from "@/lib/auth/rate-limit";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_S, sessionSecret } from "@/lib/auth/session";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = clientIp(await headers());
  if (isLoginBlocked(ip)) return { error: "Terlalu banyak percobaan, coba lagi nanti" };

  const hash = process.env.APP_PASSWORD_HASH;
  const ok = !!hash && (await verifyPassword(String(formData.get("password") ?? ""), hash));
  if (!ok) {
    recordLoginFailure(ip);
    return { error: "Password salah" };
  }

  clearLoginFailures(ip);
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
