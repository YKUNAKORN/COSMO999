// Deliberate empty state for routes whose real feature lands in a later
// phase. No fabricated data - just the icon, the name, and when it arrives.
import type { LucideIcon } from "lucide-react";

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="reveal flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid size-16 place-items-center rounded-full border border-border-strong bg-surface-raised text-accent shadow-gold">
        <Icon className="size-8" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mx-auto max-w-xs text-sm text-text-muted">{description}</p>
      </div>

      <p className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted">
        กำลังจะมาในเฟส {phase}
      </p>
    </div>
  );
}
