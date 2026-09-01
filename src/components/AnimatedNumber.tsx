"use client";

// Count-up primitive for score figures. Animates from the previously shown
// value to the next one over --duration-slow, eased to approximate
// --ease-out-soft (a CSS cubic-bezier cannot be evaluated directly inside a
// requestAnimationFrame loop, so this is a close JS equivalent). Jumps
// straight to the target with no animation when the visitor has
// prefers-reduced-motion set.
import { useEffect, useRef, useState } from "react";

const DURATION_MS = 520;

function easeOutSoft(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = value;
      setDisplayValue(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      setDisplayValue(from + delta * easeOutSoft(progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const rounded = Math.round(displayValue);

  return (
    <span className={className}>
      {rounded > 0 ? "+" : ""}
      {rounded}
    </span>
  );
}
