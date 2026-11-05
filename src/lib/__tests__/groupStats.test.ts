import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeGroupStats } from "../groupStats.ts";
import type { Group, HistoryEntry } from "../../types/models.ts";

const group: Group = {
  id: "a_b_c",
  name: "A + B + C",
  playerIds: ["a", "b", "c"],
  scores: { a: 50, b: -10, c: -40 },
};

function entry(
  id: string,
  groupId: string,
  playerScores: Record<string, number>,
): HistoryEntry {
  return {
    id,
    timestamp: "2026-01-01T00:00:00.000Z",
    groupName: "x",
    groupId,
    multiplier: 1,
    playerScores,
    commentary: "",
  };
}

describe("computeGroupStats", () => {
  it("counts only rounds that carry this group's id (all time)", () => {
    const history = [
      entry("1", "a_b_c", { a: 20, b: -10, c: -10 }),
      entry("2", "a_b_c", { a: 30, b: 0, c: -30 }),
      // Same players but a different group id (someone swapped in): not counted.
      entry("3", "a_b_c_d", { a: 10, b: 10, c: -10, d: -10 }),
      entry("4", "a_b", { a: 5, b: -5 }),
    ];
    assert.equal(computeGroupStats(group, history).totalRounds, 2);
  });

  it("counts rounds where all members played, even with extra players", () => {
    const history = [
      entry("1", "a_b_c", { a: 20, b: -10, c: -10 }),
      entry("2", "a_b_c_d", { a: 10, b: 10, c: -10, d: -10 }),
      entry("3", "a_b", { a: 5, b: -5 }),
    ];
    const stats = computeGroupStats(group, history);
    assert.equal(stats.totalRounds, 1);
    assert.equal(stats.playedTogetherRounds, 2);
  });

  it("returns zero rounds and no leaders for an empty history", () => {
    const stats = computeGroupStats(
      { ...group, scores: { a: 0, b: 0, c: 0 } },
      [],
    );
    assert.equal(stats.totalRounds, 0);
    assert.deepEqual(stats.leaderIds, []);
    assert.deepEqual(stats.lastPlaceIds, []);
  });

  it("tallies wins and losses per member and finds leader / last place", () => {
    const history = [
      entry("1", "a_b_c", { a: 20, b: -10, c: -10 }),
      entry("2", "a_b_c", { a: -30, b: 20, c: 10 }),
    ];
    const stats = computeGroupStats(group, history);

    assert.deepEqual(stats.leaderIds, ["a"]);
    assert.deepEqual(stats.lastPlaceIds, ["c"]);
    assert.equal(stats.records.a.wins, 1);
    assert.equal(stats.records.a.losses, 1);
    assert.equal(stats.records.b.wins, 1);
    assert.equal(stats.records.c.winRate, 0);
  });

  it("makes the non-leader who beats the leader most often the nemesis", () => {
    const history = [
      entry("1", "a_b_c", { a: -20, b: 20, c: 0 }),
      entry("2", "a_b_c", { a: -10, b: 10, c: 0 }),
    ];
    assert.deepEqual(computeGroupStats(group, history).nemesisIds, ["b"]);
  });
});
