// Domain models. Shapes must match the legacy RTDB structure under
// project dummy-ae198 exactly - do not rename, drop, or retype fields.

export interface Player {
  id: string;
  name: string;
  image: string;
  totalScore: number;
  // Nullable on purpose: the legacy app initialises latestScore as null for a
  // player who has not been scored in any round yet. Keep the null - code must
  // handle "no score yet" rather than assuming a number.
  latestScore: number | null;
}

export interface Group {
  id: string;
  name: string;
  playerIds: string[];
  scores: Record<string, number>;
}

export interface HistoryEntry {
  id: string;
  // String on purpose: the legacy app stores this as an ISO 8601 string from
  // new Date().toISOString(), not a numeric epoch. Do not change it to number
  // or existing history rows stop parsing.
  timestamp: string;
  groupName: string;
  groupId: string;
  multiplier: number;
  playerScores: Record<string, number>;
  commentary: string;
}

// Shape of the whole room node (DB_PATHS.root). history stays an object
// keyed by match id - unlike players/groups it is never written back as an
// array - matching the legacy dummyRoom/history structure exactly.
export interface RoomData {
  players: Player[];
  groups: Group[];
  history: Record<string, HistoryEntry>;
}
