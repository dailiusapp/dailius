import Image from "next/image";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Dailius"
      width={1942}
      height={809}
      priority
      className={cn("h-8 w-auto", className)}
    />
  );
}
