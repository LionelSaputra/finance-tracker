"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Finance</h1>
      <form action={action} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
        />
        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="w-full rounded-lg bg-teal-700 px-3 py-2 font-medium text-white disabled:opacity-60">
          {pending ? "Memeriksa…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}
