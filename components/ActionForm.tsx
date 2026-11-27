"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/action";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  danger?: boolean;
  confirm?: string;
};

/** A form bound to a server action that shows the action's success or error message under the button. */
export function ActionForm({ action, submitLabel, children, className = "space-y-2", danger, confirm }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <button
        disabled={pending}
        className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60 ${danger ? "border border-red-300 text-red-700" : "bg-teal-700 text-white"}`}
      >
        {pending ? "Menyimpan…" : submitLabel}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-teal-700">{state.ok}</p>}
    </form>
  );
}

export const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";
