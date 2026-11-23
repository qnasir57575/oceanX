/**
 * Uncontrolled filter fields used inside <FilterForm>. They render plain
 * form controls (Server-Component safe); FilterForm handles applying them.
 */
import { useId } from "react";
import type { Option } from "@/lib/ui/options";
import { cn } from "@/lib/ui/cn";

const control =
  "mt-1.5 block w-full rounded-md border border-line-strong bg-white px-3 text-[0.9375rem] text-ink focus:border-glacier-700";

export function SelectField({
  name,
  label,
  options,
  value,
  allLabel = "All",
  className,
}: {
  name: string;
  label: string;
  options: Option[];
  value?: string | null;
  allLabel?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className={cn(control, "h-11")}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({
  name,
  label,
  value,
  placeholder,
  type = "text",
  inputMode,
  min,
  max,
  hint,
  className,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  placeholder?: string;
  type?: "text" | "search" | "number" | "date";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number | string;
  max?: number | string;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        min={min}
        max={max}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        aria-describedby={hint ? hintId : undefined}
        className={cn(control, "h-11")}
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  checked,
  value = "true",
}: {
  name: string;
  label: string;
  checked?: boolean;
  value?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <input
        id={id}
        name={name}
        type="checkbox"
        value={value}
        defaultChecked={checked}
        className="size-5 rounded border-line-strong accent-glacier-700"
      />
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
    </div>
  );
}
