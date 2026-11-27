"use client";

import { useActionState } from "react";
import type { LoginState } from "./actions";

type Props = {
  action: (prev: LoginState, fd: FormData) => Promise<LoginState>;
  title: string;
  intro?: string;
  submitLabel: string;
  confirm?: boolean;
};

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";

export function PasswordForm({ action, title, intro, submitLabel, confirm }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
      {intro && <p className="mb-6 text-sm text-slate-600">{intro}</p>}
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
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="w-full rounded-lg bg-teal-700 px-3 py-2 font-medium text-white disabled:opacity-60">
          {pending ? "Memeriksa…" : submitLabel}
        </button>
      </form>
    </main>
  );
}
