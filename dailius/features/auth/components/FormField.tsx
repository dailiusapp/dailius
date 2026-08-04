import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const FormField = forwardRef<
  HTMLInputElement,
  {
    id: string;
    label: string;
    error?: string;
  } & React.InputHTMLAttributes<HTMLInputElement>
>(function FormField({ id, label, error, ...inputProps }, ref) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1",
          error
            ? "border-red-400 focus:ring-red-400"
            : "border-gray-300 focus:border-brand-to focus:ring-brand-to",
        )}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
