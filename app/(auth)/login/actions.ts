"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, registerPassword } from "@/lib/auth/account";
import { clearLoginFailures, clientIp, isLoginBlocked, recordLoginFailure } from "@/lib/auth/rate-limit";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_S, sessionSecret } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { DomainError } from "@/lib/validation";

export type LoginState = { error?: string } | undefined;

async function startSession() {
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = clientIp(await headers());
  if (isLoginBlocked(ip)) return { error: "Terlalu banyak percobaan, coba lagi nanti" };

  if (!(await checkPassword(getDb(), String(formData.get("password") ?? "")))) {
    recordLoginFailure(ip);
    return { error: "Password salah" };
  }

  clearLoginFailures(ip);
  await startSession();
  redirect("/");
}

export async function register(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pw = String(formData.get("password") ?? "");
  if (pw !== String(formData.get("confirm") ?? "")) return { error: "Kedua password tidak sama" };
  try {
    await registerPassword(getDb(), pw);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  await startSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
