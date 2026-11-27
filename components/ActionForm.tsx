"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/action";
import { dangerButton, outlineButton, primaryButton } from "./styles";

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
  pendingLabel?: string;
  children?: ReactNode;
  className?: string;
  danger?: boolean;
  quiet?: boolean;
  confirm?: string;
};


/** A form bound to a server action that shows the action's success or error message under the button. */
export function ActionForm({ action, submitLabel, pendingLabel = "Menyimpan…", children, className = "space-y-2", danger, quiet, confirm }: Props) {
  const [state, onSubmit, pending] = useKeepValuesAction(action, confirm);
  const ref = useRef<HTMLFormElement>(null);
  // After a success, inputs go back to their (refreshed) defaults, e.g. an "add" form empties.
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      {children}
      <button disabled={pending} className={danger ? dangerButton : quiet ? outlineButton : primaryButton}>
        {pending ? pendingLabel : submitLabel}
      </button>
      <p aria-live="polite" className="empty:hidden text-sm">
        {state?.error ? <span className="text-merah">{state.error}</span> : state?.ok ? <span className="text-aman">{state.ok}</span> : null}
      </p>
    </form>
  );
}

