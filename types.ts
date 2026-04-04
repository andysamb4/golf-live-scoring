// Fix: Added full type definitions for the application.
export interface Hole {
  hole: number;
  par: number;
  strokeIndex: number;
}

/** A single set of tees (e.g. White, Yellow, Red) with its own rating and hole data */
export interface TeeSet {
  name: string;         // e.g. "White", "Yellow", "Red", "Blue"
  slopeRating?: number; // WHS Slope (55–155)
  courseRating?: number; // WHS Course Rating (e.g. 70.3)
  holes: Hole[];
}

export interface Course {
  id?: string;
  name: string;
  /** All tee sets extracted from the scorecard (White, Yellow, Red…) */
  teeSets?: TeeSet[];
  /** Active tee set's holes – the one being used for the current game */
  holes: Hole[];
  /** Active tee set's slope/rating */
  slopeRating?: number;
  courseRating?: number;
}

export interface Player {
  id: string;
  name: string;
  handicap: number;
  playingHandicap?: number;
  /** The tee set this player is playing from — overrides the course-level tee for handicap purposes */
  selectedTee?: TeeSet;
}

export enum GameType {
  Stableford = 'Stableford',
  Medal = 'Medal',
  Skins = 'Skins',
  MatchPlay = 'Match Play',
}

export interface GameSettings {
  players: Player[];
  course: Course;
  gameType: GameType;
  /** If this is a group game, the group ID */
  groupId?: string;
}

export interface GameState extends GameSettings {
  id: string;
  scores: { [playerId: string]: (number | null)[] };
  currentHole: number;
  status: 'playing' | 'finished';
  /** If this is a group game, the group ID */
  groupId?: string;
}

export type View = 'home' | 'setup' | 'scoring' | 'leaderboard' | 'groups' | 'watch' | 'tournament-hub' | 'create-tournament' | 'join-tournament' | 'group-scoring';

/** A member of a handicap group */
export interface GroupMember {
  name: string;
  whsHandicap: number;
  groupHandicap: number;
}

/** Record of a completed group game for history */
export interface GroupGameRecord {
  date: string; // ISO date
  courseName: string;
  /** Finishing order: array of member names from 1st to last */
  finishingOrder: string[];
  /** Handicap adjustments applied: { memberName: adjustment } */
  adjustments: { [memberName: string]: number };
}

/** Handicap adjustment rules based on finishing position */
export interface GroupHandicapRules {
  first: number;   // e.g. -1
  second: number;  // e.g. 0
  third: number;   // e.g. 0.5
  fourthAndBelow: number; // e.g. 1
}

/** A group of players who play regularly together */
export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  rules: GroupHandicapRules;
  gameHistory: GroupGameRecord[];
  createdAt: string; // ISO date
}

/** Data stored in Firestore for a live game */
export interface LiveGameData {
  id: string;
  courseName: string;
  gameType: GameType;
  status: 'playing' | 'finished';
  currentHole: number;
  createdAt: number;
  updatedAt: number;
  /** Full game state for real-time spectators */
  players: Player[];
  course: Course;
  scores: { [playerId: string]: (number | null)[] };
}

export interface CalculatedScore {
  playerId: string;
  playerName: string;
  total: number;
  through: number;
  matchStatus?: string;
}

export interface Source {
  web: {
    uri: string;
    title: string;
  }
}

export interface TournamentGroup {
  id: string;
  players: Player[];
  teeTime: string; // e.g. "08:00 AM" or "08:00"
  groupCode: string; // e.g. "ABC12345-G1" — used by groups to enter scores on their own device
}

export interface Tournament {
  id: string;
  joinCode: string; // 8-char code used as Firestore doc ID — share to let others join
  name: string;
  course: Course;
  gameType: GameType;
  groups: TournamentGroup[];
  scores?: { [groupIndex: number]: { [playerId: string]: (number | null)[] } };
  adminId?: string;
  status: 'upcoming' | 'live' | 'finished';
}