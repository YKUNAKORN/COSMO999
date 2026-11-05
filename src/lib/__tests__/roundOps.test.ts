import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyRound,
  applyUndo,
  buildGroupId,
  buildGroupName,
  replayScores,
} from "../roundOps.ts";
import type { RoomData } from "../../types/models.ts";

function emptyRoom(): RoomData {
  return {
    players: [
      { id: "b", name: "B", image: "", totalScore: 0, latestScore: null },
      { id: "a", name: "A", image: "", totalScore: 0, latestScore: null },
      { id: "c", name: "C", image: "", totalScore: 0, latestScore: null },
    ],
    groups: [],
    history: {},
  };
}

const round = (matchId: string, nets: Record<string, number>) => ({
  playerIds: Object.keys(nets),
  netScores: nets,
  multiplier: 2,
  commentary: "",
  matchId,
});

describe("buildGroupId / buildGroupName", () => {
  it("sorts ids so selection order does not matter", () => {
    assert.equal(buildGroupId(["b", "a"]), "a_b");
    assert.equal(buildGroupId(["a", "b"]), "a_b");
  });

  it("names a group from its players, with a placeholder for unknown ids", () => {
    const { players } = emptyRoom();
    assert.equal(buildGroupName(["b", "a"], players), "A + B");
    assert.equal(buildGroupName(["a", "zzz"], players), "A + ไม่ทราบชื่อ");
  });
});

describe("applyRound", () => {
  it("creates the group, updates totals and writes a history entry", () => {
    const next = applyRound(emptyRoom(), round("100", { a: 30, b: -30 }));

    assert.equal(next.groups.length, 1);
    assert.equal(next.groups[0].id, "a_b");
    assert.deepEqual(next.groups[0].scores, { a: 30, b: -30 });
    assert.equal(next.players.find((p) => p.id === "a")?.totalScore, 30);
    assert.equal(next.players.find((p) => p.id === "b")?.latestScore, -30);
    assert.equal(next.players.find((p) => p.id === "c")?.totalScore, 0);
    assert.equal(next.history["100"].groupId, "a_b");
  });

  it("is idempotent for the same matchId (late-committed retry)", () => {
    const once = applyRound(emptyRoom(), round("100", { a: 30, b: -30 }));
    const twice = applyRound(once, round("100", { a: 30, b: -30 }));

    assert.equal(twice, once);
    assert.equal(Object.keys(twice.history).length, 1);
    assert.equal(twice.players.find((p) => p.id === "a")?.totalScore, 30);
  });

  it("accumulates into an existing group", () => {
    let room = applyRound(emptyRoom(), round("100", { a: 30, b: -30 }));
    room = applyRound(room, round("101", { b: 10, a: -10 }));

    assert.equal(room.groups.length, 1);
    assert.deepEqual(room.groups[0].scores, { a: 20, b: -20 });
  });

  it("does not mutate the input room", () => {
    const room = emptyRoom();
    applyRound(room, round("100", { a: 30, b: -30 }));
    assert.equal(room.groups.length, 0);
    assert.equal(room.players[1].totalScore, 0);
  });
});

describe("applyUndo", () => {
  it("restores totals and group scores and removes the entry", () => {
    const base = emptyRoom();
    const saved = applyRound(base, round("100", { a: 30, b: -30 }));
    const undone = applyUndo(saved, "100");

    assert.deepEqual(undone.history, {});
    assert.equal(undone.players.find((p) => p.id === "a")?.totalScore, 0);
    assert.deepEqual(undone.groups[0].scores, { a: 0, b: 0 });
  });

  it("is a no-op for a missing entry", () => {
    const room = emptyRoom();
    assert.equal(applyUndo(room, "nope"), room);
  });
});

describe("replayScores", () => {
  it("rebuilds totals from history, ignoring corrupted stored totals", () => {
    let room = applyRound(emptyRoom(), round("100", { a: 30, b: -30 }));
    room = applyRound(room, round("101", { a: -5, b: 5 }));

    const corrupted: RoomData = {
      ...room,
      players: room.players.map((p) => ({ ...p, totalScore: 999 })),
      groups: room.groups.map((g) => ({ ...g, scores: { a: 999, b: 999 } })),
    };
    const fixed = replayScores(corrupted);

    assert.equal(fixed.players.find((p) => p.id === "a")?.totalScore, 25);
    assert.equal(fixed.players.find((p) => p.id === "b")?.totalScore, -25);
    assert.deepEqual(fixed.groups[0].scores, { a: 25, b: -25 });
  });
});
