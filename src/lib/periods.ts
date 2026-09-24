// Bi-weekly period engine. Pure and derived entirely from timestamps - no
// Firebase access, no side effects. Asia/Bangkok is a fixed UTC+7 offset
// with no DST, so shifting an instant by +7h and reading its UTC calendar
// fields gives Bangkok's civil date without needing timezone data.

import type { HistoryEntry } from "@/types/models";

export type PeriodHalf = "A" | "B";

export interface Period {
  key: string;
  year: number;
  month: number; // 0-11
  half: PeriodHalf;
  label: string;
}

const THAI_MONTH_ABBR = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

// Day 0 of the following month rolls back to the last day of this one -
// plain calendar arithmetic, not an instant, so UTC here is just a
// calculator and carries no timezone meaning.
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function buildPeriod(year: number, month: number, half: PeriodHalf): Period {
  const startDay = half === "A" ? 1 : 16;
  const endDay = half === "A" ? 15 : lastDayOfMonth(year, month);
  const key = `${year}-${String(month + 1).padStart(2, "0")}-${half}`;
  // The label is user-facing Thai text, so its year is Buddhist era
  // (year + 543) to match the convention History.tsx already uses via
  // toLocaleString("th-TH"). `year` on the returned Period stays the plain
  // Gregorian calendar year - only the display label is localised.
  const label = `${startDay}–${endDay} ${THAI_MONTH_ABBR[month]} ${year + 543}`;
  return { key, year, month, half, label };
}

export function getPeriodOfTimestamp(iso: string): Period {
  // Shift the instant by +7h, then read UTC fields to get Bangkok's civil
  // date (Bangkok has no DST, so the fixed offset is exact year-round).
  const bkk = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  const year = bkk.getUTCFullYear();
  const month = bkk.getUTCMonth();
  const day = bkk.getUTCDate();
  const half: PeriodHalf = day <= 15 ? "A" : "B";
  return buildPeriod(year, month, half);
}

export function getCurrentPeriod(now: Date = new Date()): Period {
  return getPeriodOfTimestamp(now.toISOString());
}

// Distinct periods actually represented in history, newest first. Sorting
// lexicographically on `key` works because year/month are zero-padded and
// "A" < "B" alphabetically, matching chronological order within a month.
export function listPeriodsInHistory(history: HistoryEntry[]): Period[] {
  const byKey = new Map<string, Period>();
  for (const entry of history) {
    const period = getPeriodOfTimestamp(entry.timestamp);
    if (!byKey.has(period.key)) {
      byKey.set(period.key, period);
    }
  }
  return [...byKey.values()].sort((a, b) => b.key.localeCompare(a.key));
}
