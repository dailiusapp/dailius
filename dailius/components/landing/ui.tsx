import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-12", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold tracking-wide text-brand-to uppercase">
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        className={cn(
          "text-3xl font-semibold tracking-tight text-navy sm:text-4xl",
          eyebrow && "mt-3",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-lg leading-7 text-gray-600">{description}</p>
      ) : null}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]";

const buttonVariants = {
  primary:
    "bg-gradient-to-b from-brand-from to-brand-to text-white shadow-sm shadow-blue-900/10 hover:brightness-105 focus-visible:ring-brand-to",
  secondary:
    "border border-navy/25 bg-white text-navy hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:ring-navy/40",
  ghost:
    "text-navy hover:bg-navy/[0.05] focus-visible:ring-navy/30",
};

export function Button({
  href,
  variant = "primary",
  children,
  className,
  ...props
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  children: ReactNode;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonVariants[variant], className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-from opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-to" />
      </span>
      {children}
    </span>
  );
}
