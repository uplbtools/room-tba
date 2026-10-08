import type {
  Badge,
  ContributionKind,
  HallOfFameEntry,
  KindBreakdown,
  LeaderboardWindow,
} from "./scoring";

export type LeaderboardBoard = "community" | "editors";

export type LeaderboardPeriodInfo = {
  label: string;
  endsAt: string;
  daysLeft: number;
};

/** One public leaderboard row. `key` is opaque and safe to share. */
export type LeaderboardRow = {
  rank: number;
  key: string;
  displayName: string;
  points: number;
  contributionCount: number;
  breakdown: KindBreakdown;
  medal: 1 | 2 | 3 | null;
  gettingStarted: boolean;
  lastContributionAt: string;
};

export type LeaderboardHallOfFame = Array<
  Omit<HallOfFameEntry, "winners" | "startMs"> & {
    winners: Array<{ key: string; displayName: string; points: number }>;
  }
>;

export type LeaderboardResponse = {
  window: LeaderboardWindow;
  board: LeaderboardBoard;
  period: LeaderboardPeriodInfo | null;
  rows: LeaderboardRow[];
  hallOfFame: LeaderboardHallOfFame;
};

export type MyStanding = {
  key: string;
  displayName: string;
  /** Null when the account is hidden from credits. */
  rank: number | null;
  points: number;
  contributionCount: number;
  breakdown: KindBreakdown;
  toPass: { points: number; rank: number } | null;
  optedOut: boolean;
  /** All-time approved edits that still stand (badges count these). */
  totalContributions: number;
  badges: Badge[];
  /** All-time approved edits that still stand, newest first (for rewards). */
  recent: Array<{
    id: number;
    kind: ContributionKind;
    points: number;
    entityLabel: string;
    createdAt: string;
  }>;
};

export type MyStandingResponse = {
  window: LeaderboardWindow;
  board: LeaderboardBoard;
  me: MyStanding | null;
};

export type ContributorProfile = {
  key: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  joinedAt: string;
  points: number;
  contributionCount: number;
  breakdown: KindBreakdown;
  badges: Badge[];
  recent: Array<{
    id: number;
    kind: ContributionKind;
    entityLabel: string;
    href: string | null;
    createdAt: string;
  }>;
};
