"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/action";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Submits a form to a server action without React's automatic form reset, so a rejected
 * submission keeps what the user typed. Returns [state, onSubmit, pending].
 */
export function useKeepValuesAction(action: Action, confirm?: string) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
  return [state, onSubmit, pending] as const;
}

type Props = {
  action: Action;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  danger?: boolean;
  confirm?: string;
};

/** A form bound to a server action that shows the action's success or error message under the button. */
export function ActionForm({ action, submitLabel, children, className = "space-y-2", danger, confirm }: Props) {
  const [state, onSubmit, pending] = useKeepValuesAction(action, confirm);
  const ref = useRef<HTMLFormElement>(null);
  // After a success, inputs go back to their (refreshed) defaults, e.g. an "add" form empties.
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
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
