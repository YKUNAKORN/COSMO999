// Domain models. Shapes must match the legacy RTDB structure under
// project dummy-ae198 exactly - do not rename or drop fields.

export interface Player {
  id: string;
  name: string;
  image: string;
  totalScore: number;
  latestScore: number;
}

export interface Group {
  id: string;
  name: string;
  playerIds: string[];
  scores: Record<string, number>;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  groupName: string;
  groupId: string;
  multiplier: number;
  playerScores: Record<string, number>;
  commentary: string;
}
