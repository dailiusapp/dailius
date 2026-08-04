import type { ReactNode } from "react";

export function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
      {description ? <p className="mt-2 text-[15px] leading-6 text-gray-600">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function StepFooter({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex items-center justify-between gap-3">{children}</div>;
}
