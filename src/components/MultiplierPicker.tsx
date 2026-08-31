"use client";

// Round score multiplier. The caller owns the value: tapping a chip reports
// an explicit choice (onChange), the dice button reports a randomised one
// (onRandomize sets isRandom on the parent). Mirrors the legacy multiplier
// <select> plus randomMultiplier() in reference/legacy-prototype.html.
import { Dices } from "lucide-react";

// Legacy multiplier ladder, kept in the same order as the prototype.
export const MULTIPLIERS = [1, 2, 4, 5, 8, 10, 20] as const;

export function MultiplierPicker({
  value,
  onChange,
  onRandomize,
  isRandom,
}: {
  value: number;
  onChange: (value: number) => void;
  onRandomize: () => void;
  isRandom: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {MULTIPLIERS.map((m) => {
          const active = value === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              aria-pressed={active}
              className={`min-w-12 rounded-md border px-3 py-2 text-sm font-semibold tabular-nums transition-colors ${
                active
                  ? "border-border-strong bg-accent text-on-accent"
                  : "border-border bg-surface-raised text-text hover:border-border-strong"
              }`}
            >
              x{m}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onRandomize}
          aria-pressed={isRandom}
          className={`flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-2 text-sm font-semibold transition-colors ${
            isRandom
              ? "bg-accent-strong text-on-accent"
              : "bg-surface-raised text-accent hover:bg-surface"
          }`}
        >
          <Dices className="size-4" />
          สุ่ม
        </button>
      </div>

      {isRandom ? (
        <p className="text-xs text-text-muted tabular-nums">
          รอบนี้สุ่มตัวคูณเป็น x{value}
        </p>
      ) : null}
    </div>
  );
}
