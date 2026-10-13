import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  shimmer = false,
}: {
  className?: string;
  shimmer?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        shimmer ? "skeleton-shimmer" : "animate-pulse",
        "bg-paper-2",
        className,
      )}
    />
  );
}
