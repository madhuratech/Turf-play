export type SportType = 'cricket' | 'football';

export interface CricketScore {
  runs: number;
  wickets: number;
  overs: number; // e.g. 4.2
  balls: number; // total legal balls faced
  fours: number;
  sixes: number;
  extras: number;
  runRate?: number;
}

export interface FootballScore {
  goals: number;
  shootoutGoals?: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  fouls: number;
}

export type TeamKey = 'teamA' | 'teamB';

export interface ScoreEvent {
  id: string;
  timestamp: number;
  team: TeamKey;
  eventType:
    | 'cricket_run'
    | 'cricket_wicket'
    | 'cricket_extra'
    | 'football_goal'
    | 'football_card'
    | 'football_stat'
    | 'dot'
    | 'wide'
    | 'no_ball'
    | 'bye'
    | 'half_start'
    | 'half_end'
    | 'match_end';
  value: number;
  label: string;
  isHighlight?: 'six' | 'four' | 'goal' | 'wicket';
  ball?: string | null;
  minute?: number | null;
  undone?: boolean;
  metadata?: any;
}

export type RoomPhase =
  | 'waiting_for_opponent'
  | 'toss_pending'
  | 'toss_result'
  | 'choice_pending'
  | 'in_progress'
  | 'innings_break'
  | 'half_time'
  | 'extra_time'
  | 'shootout'
  | 'finished';

export type TossChoice = 'bat' | 'bowl' | 'kickoff' | 'side';

export interface RoomClaims {
  teamA: string | null; // deviceId
  teamB: string | null; // deviceId
}

export interface MatchRules {
  oversPerInnings: number;
  playersPerSide: number;
  maxWickets: number;
  wideNoBallRerun: boolean;
  halfMinutes: number;
  halves: number;
  drawRule: 'draw' | 'golden_goal' | 'shootout';
  mercyGoalLead: number | null;
  ruleSummary: string;
}

export interface PlayerRosterItem {
  id: string;
  name: string;
  position: number;
}

export interface BatterStats {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal: string | null;
}

export interface BowlerStats {
  id: string;
  name: string;
  overs: number;
  ballsInOver: number;
  totalLegalBalls: number;
  oversFormatted: string;
  runs: number;
  wickets: number;
  maidens: number;
}

export interface OverBallDot {
  id: string;
  display: string;
  highlight?: 'four' | 'six' | 'wicket' | 'wide' | 'no_ball';
  isLegal: boolean;
}

export interface CreaseState {
  striker: BatterStats | null;
  nonStriker: BatterStats | null;
  bowler: BowlerStats | null;
  currentBatterId?: string | null;
  currentNonStrikerId?: string | null;
  currentBowlerId?: string | null;
  hasNames: boolean;
}

export interface CricketLiveState {
  innings: number;
  legalBallsInInnings: number;
  oversFormatted: string;
  currentRunRate: number;
  firstInningsRuns: number | null;
  firstInningsWickets: number | null;
  target: number | null;
  runsNeeded: number | null;
  ballsRemaining: number | null;
  requiredRunRate: number | null;
  chaseText?: string | null;
  currentOverDots?: OverBallDot[];
  last6Balls?: OverBallDot[];
  crease?: CreaseState;
  batters?: Record<string, BatterStats>;
  bowlers?: Record<string, BowlerStats>;
}

export interface GoalTimelineItem {
  id: string;
  team: string;
  scorerName: string | null;
  assistName: string | null;
  goalType: string;
  minute: number;
  half: number;
  period: string;
  commentary?: string | null;
}

export interface FootballLiveState {
  currentHalf: number;
  clockRunning: boolean;
  clockAccumulatedMs: number;
  clockLastStartedAt: string | null;
  shootoutScoreA: number;
  shootoutScoreB: number;
  goalsTimeline?: GoalTimelineItem[];
}

export interface MatchResult {
  winner: 'teamA' | 'teamB' | 'draw' | 'tie' | null;
  resultText: string | null;
  finishedAt: string | null;
  endedReason:
    | 'overs_complete'
    | 'all_out'
    | 'target_chased'
    | 'time_up'
    | 'mercy_rule'
    | 'host_ended'
    | null;
}

export interface CommentaryItem {
  id: string;
  text: string;
  kind: string;
  timestamp: number;
  team: string;
}

export interface LastEvent {
  id: string;
  kind:
    | 'dot'
    | 'single'
    | 'two'
    | 'three'
    | 'four'
    | 'six'
    | 'wicket'
    | 'wide'
    | 'no_ball'
    | 'bye'
    | 'leg_bye'
    | 'goal'
    | 'own_goal'
    | 'penalty'
    | 'half_start'
    | 'half_end'
    | 'match_end';
  team: string;
  playerName?: string | null;
  text: string;
  wicketType?: string | null;
}

export interface MatchRoom {
  code: string;
  sport: SportType;
  createdAt: number;
  status: 'live' | 'finished';
  phase: RoomPhase;
  revision: number;
  hostDeviceId?: string | null;
  teamA: {
    id: 'teamA';
    name: string;
    color?: string;
    players?: PlayerRosterItem[];
    hasRoster?: boolean;
    cricketScore?: CricketScore;
    footballScore?: FootballScore;
  };
  teamB: {
    id: 'teamB';
    name: string;
    color?: string;
    players?: PlayerRosterItem[];
    hasRoster?: boolean;
    cricketScore?: CricketScore;
    footballScore?: FootballScore;
  };
  claims: RoomClaims;
  tossWinner?: TeamKey | null;
  tossChoice?: TossChoice | null;
  tossTimestamp?: number;
  battingTeam?: TeamKey | null; // Cricket: current batting team
  rules: MatchRules;
  cricketState?: CricketLiveState | null;
  footballState?: FootballLiveState | null;
  result?: MatchResult | null;
  events: ScoreEvent[];
  commentary?: CommentaryItem[];
  latestCommentary?: string | null;
  lastEvent?: LastEvent | null;
  lastUpdated: number;
  qrImageBase64?: string;
}

export interface MatchRulesInput {
  // Cricket
  oversPerInnings?: number;
  playersPerSide?: number;
  wideNoBallRerun?: boolean;
  // Football
  halfMinutes?: number;
  halves?: number;
  drawRule?: 'draw' | 'golden_goal' | 'shootout';
  mercyGoalLead?: number | null;
}

export interface CreateRoomInput {
  sport: SportType;
  teamAName: string;
  teamBName: string;
  hostDeviceId?: string;
  rules?: MatchRulesInput;
  claimTeam?: TeamKey | null;
  teamAColor?: string;
  teamBColor?: string;
}

// Turf types
export interface TurfSlot {
  id: string;
  startTime: string; // e.g. "06:00 AM"
  endTime: string; // e.g. "07:00 AM"
  available: boolean;
  price: number; // INR
}

export interface TurfReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface TurfItem {
  id: string;
  name: string;
  city: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  sports: SportType[];
  pricePerHour: number;
  rating: number;
  reviewsCount: number;
  distanceKm?: number;
  amenities: string[];
  imageUrl: string;
  slots: TurfSlot[];
  reviews: TurfReview[];
}

export type Turf = TurfItem;

export interface DaySlots {
  date: string;
  dayLabel: string;
  label?: string;
  slots: TurfSlot[];
}

export interface BookingRequestInput {
  turfId: string;
  slotId: string;
  date: string;
  playerName: string;
  phone: string;
  sport: SportType;
}

export interface BookingConfirmation {
  id?: string;
  bookingId: string;
  turf: {
    id: string;
    name: string;
  };
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    price: number;
  };
  date: string;
  playerName: string;
  phone?: string;
  sport?: SportType;
  confirmedAt?: string;
}
