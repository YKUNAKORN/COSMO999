"use client";

// Round score multiplier. The caller owns the value: tapping a chip reports
// an explicit choice (onChange), the dice button reports a randomised one
// (onRandomize sets isRandom on the parent). Mirrors the legacy multiplier
// <select> plus randomMultiplier() in reference/legacy-prototype.sanitized.html.
import { useEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";

// Legacy multiplier ladder, kept in the same order as the prototype.
export const MULTIPLIERS = [1, 2, 4, 5, 8, 10, 20] as const;

// Kept in step with --duration-slow in globals.css: how long the dice tumbles
// before the randomised value is committed.
const ROLL_MS = 520;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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
  const [rolling, setRolling] = useState(false);
  const [rollId, setRollId] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending roll if the component unmounts mid-tumble.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleRandomize() {
    if (rolling) return;

    if (prefersReducedMotion()) {
      onRandomize();
      return;
    }

    setRolling(true);
    setRollId((id) => id + 1);
    timerRef.current = setTimeout(() => {
      onRandomize();
      setRolling(false);
      timerRef.current = null;
    }, ROLL_MS);
  }

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
              disabled={rolling}
              aria-pressed={active}
              className={`min-w-12 rounded-md border px-3 py-2 text-sm font-semibold tabular-nums transition-[colors,transform] active:scale-95 disabled:opacity-50 ${
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
          onClick={handleRandomize}
          disabled={rolling}
          aria-pressed={isRandom}
          className={`flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-2 text-sm font-semibold transition-[colors,transform] active:scale-95 disabled:opacity-70 ${
            isRandom
              ? "bg-accent-strong text-on-accent"
              : "bg-surface-raised text-accent hover:bg-surface"
          }`}
        >
          <Dices key={rollId} className={`size-4 ${rolling ? "dice-tumble" : ""}`} />
          สุ่ม
        </button>
      </div>

      {rolling ? (
        <p className="text-xs text-text-muted">กำลังทอยลูกเต๋า...</p>
      ) : isRandom ? (
        <p className="text-xs text-text-muted tabular-nums">
          รอบนี้สุ่มตัวคูณเป็น x{value}
        </p>
      ) : null}
    </div>
  );
}
