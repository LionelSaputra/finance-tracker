"use client";

import { useActionState } from "react";
import type { LoginState } from "./actions";
import { inputClass as field, primaryButton } from "@/components/styles";

type Props = {
  action: (prev: LoginState, fd: FormData) => Promise<LoginState>;
  title: string;
  intro?: string;
  submitLabel: string;
  confirm?: boolean;
};


export function PasswordForm({ action, title, intro, submitLabel, confirm }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 border-b-2 border-ink pb-2 font-narrow text-5xl font-bold">{title}</h1>
      {intro && <p className="mb-6 text-sm text-ink-2">{intro}</p>}
      <form action={formAction} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete={confirm ? "new-password" : "current-password"} required autoFocus minLength={confirm ? 12 : undefined} className={field} />
        {confirm && (
          <>
            <label className="block text-sm font-medium" htmlFor="confirm">
              Ulangi password
            </label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} className={field} />
          </>
        )}
        {state?.error && (
          <p role="alert" className="text-sm text-merah">
            {state.error}
          </p>
        )}
        <button disabled={pending} className={`${primaryButton} h-12 w-full text-base`}>
          {pending ? "Memeriksa…" : submitLabel}
        </button>
      </form>
    </main>
  );
}
