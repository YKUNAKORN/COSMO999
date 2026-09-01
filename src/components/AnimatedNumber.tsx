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
  // Mirrors displayValue outside React state so a value change that
  // interrupts an in-flight animation can hand off from wherever the
  // number actually stopped, not from the older completed-animation start.
  const displayRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = value;
      displayRef.current = value;
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
      const next = from + delta * easeOutSoft(progress);
      displayRef.current = next;
      setDisplayValue(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = displayRef.current;
    };
  }, [value]);

  const rounded = Math.round(displayValue);

  return (
    <span className={className}>
      {rounded > 0 ? "+" : ""}
      {rounded}
    </span>
  );
}
