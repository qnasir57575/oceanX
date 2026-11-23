"use client";

/**
 * Accessible form controls: visible labels, hints and errors linked with
 * aria-describedby, aria-invalid on error, and a focusable error summary.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/ui/cn";

const inputClass = (invalid: boolean, margin = true) =>
  cn(
    margin && "mt-1.5",
    "block h-11 w-full rounded-md border bg-white px-3 text-[0.9375rem] text-ink placeholder:text-ink-muted/80",
    invalid ? "border-danger" : "border-line-strong focus:border-glacier-700",
  );

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  name: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
};

export function Field({ label, hint, error, optional, className, ...input }: InputProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={inputClass(Boolean(error))} {...input} />
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="mt-1 flex items-center gap-1 text-sm text-danger">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  ...textarea
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  name: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(inputClass(Boolean(error)), "h-auto min-h-28 py-2")}
        {...textarea}
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="mt-1 flex items-center gap-1 text-sm text-danger">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField(props: Omit<InputProps, "type">) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const { label, hint, error, className, ...input } = props;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(inputClass(Boolean(error), false), "pr-20")}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded px-2 py-1 text-sm font-medium text-glacier-700 hover:bg-glacier-50"
        >
          {visible ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </button>
      </div>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="mt-1 flex items-center gap-1 text-sm text-danger">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Form-level message. Receives focus when it appears/changes so screen
 * reader and keyboard users learn about the outcome of a submit.
 */
export function FormMessage({
  tone,
  title,
  children,
  focusKey,
}: {
  tone: "danger" | "success" | "info" | "warning";
  title?: string;
  children?: React.ReactNode;
  /** Change this value to move focus to the message again. */
  focusKey?: unknown;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [focusKey]);
  const styles = {
    danger: "border-danger/30 bg-danger-bg text-danger",
    success: "border-success/30 bg-success-bg text-success",
    info: "border-glacier-100 bg-glacier-50 text-glacier-800",
    warning: "border-warning/30 bg-warning-bg text-warning",
  }[tone];
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border p-4 text-sm focus:outline-3 focus:outline-offset-2 focus:outline-glacier-700", styles)}
    >
      <Icon name={tone === "success" ? "check" : tone === "info" ? "info" : "alert"} size={20} className="mt-0.5 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink">{children}</div> : null}
      </div>
    </div>
  );
}

export function SubmitButton({ pending, children, pendingLabel }: { pending: boolean; children: React.ReactNode; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-glacier-700 px-4 font-medium text-white hover:bg-glacier-800 disabled:opacity-70 sm:w-auto"
    >
      {pending ? (
        <>
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
