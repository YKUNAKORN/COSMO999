// Number display helpers. Fixed to the en-US locale so digit grouping is the
// same on every device (th-TH could swap in Thai numerals on some systems).

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

// Thousands-grouped number without a sign: 1200 -> "1,200".
export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

// Thousands-grouped score with an explicit "+" on gains: 18580 -> "+18,580",
// -580 -> "-580", 0 -> "0". Intl prints negative zero as "-0" (which Math.round
// produces for values just below 0 mid count-up), so zero is handled first.
export function formatSignedScore(score: number): string {
  if (score === 0) return "0";
  return score > 0 ? `+${NUMBER_FORMAT.format(score)}` : NUMBER_FORMAT.format(score);
}
