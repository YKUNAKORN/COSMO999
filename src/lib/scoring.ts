// Pure round-scoring math. Lifted verbatim from the legacy prototype's
// calculateRoundScores (reference/legacy-prototype.sanitized.html L745-761).
// No DOM, no Firebase: phase 2c calls this to build the preview, phase 2d
// re-runs it on confirm before the atomic write. Keeping it a plain function
// means both callers get identical numbers and the formula is trivial to check.

export interface RoundScoreResult {
  // Net score per player id, already multiplied. Sums to 0 for integer input.
  netScores: Record<string, number>;
  // Defensive total carried over from the legacy zero-sum assertion. It is
  // always 0 in practice for integer raw scores; a non-zero value means the
  // caller passed something malformed and the round must not be saved.
  totalNetScore: number;
  // True when at least one player finished positive. Decides whether the
  // win confetti fires after a successful save.
  hasPositive: boolean;
}

// netScore[i] = ( sum over j != i of (raw[i] - raw[j]) ) * multiplier.
// A missing or non-numeric raw score counts as 0, matching the legacy
// `(rawScoresObj[id] || 0)`.
export function calculateRoundScores(
  playerIds: string[],
  rawScores: Record<string, number>,
  multiplier: number,
): RoundScoreResult {
  const netScores: Record<string, number> = {};
  let totalNetScore = 0;
  let hasPositive = false;

  for (const selfId of playerIds) {
    let sumDifference = 0;
    for (const otherId of playerIds) {
      if (selfId !== otherId) {
        sumDifference += (rawScores[selfId] || 0) - (rawScores[otherId] || 0);
      }
    }
    const finalScore = sumDifference * multiplier;
    netScores[selfId] = finalScore;
    totalNetScore += finalScore;
    if (finalScore > 0) hasPositive = true;
  }

  return { netScores, totalNetScore, hasPositive };
}
