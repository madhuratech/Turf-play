import type { Room, RoomEvent, Player, Ball, GoalEvent } from '@prisma/client';
import { formatBallOutcome } from './recomputeMatch.js';

export type RoomWithRelations = Room & {
  events?: RoomEvent[];
  players?: Player[];
  balls?: Ball[];
  goalEvents?: GoalEvent[];
};

export function getRuleSummary(room: {
  sport: string;
  oversPerInnings: number;
  playersPerSide: number;
  maxWickets: number;
  halfMinutes: number;
  halves: number;
  drawRule: string;
}): string {
  if (room.sport === 'cricket') {
    const style =
      room.oversPerInnings <= 5
        ? 'Blitz'
        : room.oversPerInnings <= 10
        ? 'Box Cricket'
        : 'T20-style';
    return `${style} · ${room.oversPerInnings} overs · ${room.playersPerSide} players`;
  } else {
    const drawRuleLabel =
      room.drawRule === 'golden_goal'
        ? 'golden goal'
        : room.drawRule === 'shootout'
        ? 'shootout'
        : 'draw';
    return `${room.halves} × ${room.halfMinutes} min · ${room.playersPerSide}-a-side · ${drawRuleLabel}`;
  }
}

export function serializeRoom(
  room: RoomWithRelations,
  qrImageBase64?: string,
  lastEventOverride?: any
) {
  const isCricket = room.sport === 'cricket';
  const players = room.players || [];
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  const playersA = players
    .filter((p) => p.team === 'teamA')
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ id: p.id, name: p.name, position: p.position }));

  const playersB = players
    .filter((p) => p.team === 'teamB')
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ id: p.id, name: p.name, position: p.position }));

  // Non-deleted balls
  const balls = (room.balls || [])
    .filter((b) => !b.deletedAt)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.seq - b.seq);

  // Non-deleted goal events
  const goalEvents = (room.goalEvents || [])
    .filter((g) => !g.deletedAt)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.seq - b.seq);

  // Batters & Bowlers live calculation
  const battersStats: Record<
    string,
    {
      id: string;
      name: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      isOut: boolean;
      dismissal: string | null;
    }
  > = {};

  const bowlersStats: Record<
    string,
    {
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
  > = {};

  for (const p of players) {
    battersStats[p.id] = {
      id: p.id,
      name: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissal: null,
    };
    bowlersStats[p.id] = {
      id: p.id,
      name: p.name,
      overs: 0,
      ballsInOver: 0,
      totalLegalBalls: 0,
      oversFormatted: '0.0',
      runs: 0,
      wickets: 0,
      maidens: 0,
    };
  }

  // Current over dots & last 6 balls
  const currentOverBalls: Array<{
    id: string;
    runsOffBat: number;
    extraType: string;
    extraRuns: number;
    isWicket: boolean;
    wicketType?: string | null;
    isLegal: boolean;
    display: string;
    highlight?: 'four' | 'six' | 'wicket' | 'wide' | 'no_ball';
  }> = [];

  let legalInCurrentOver = 0;
  let runsInCurrentOver = 0;

  for (const b of balls) {
    const totalRuns = b.runsOffBat + b.extraRuns;

    // Batter stats
    if (b.batterId && battersStats[b.batterId]) {
      const bStat = battersStats[b.batterId];
      bStat.runs += b.runsOffBat;
      if (b.extraType !== 'wide') bStat.balls += 1;
      if (b.runsOffBat === 4) bStat.fours += 1;
      if (b.runsOffBat === 6) bStat.sixes += 1;

      if (b.isWicket) {
        const outId = b.dismissedPlayerId || b.batterId;
        if (battersStats[outId]) {
          battersStats[outId].isOut = true;
          const bowlerName = b.bowlerId ? playerMap.get(b.bowlerId)?.name : null;
          const fielderName = b.fielderId ? playerMap.get(b.fielderId)?.name : null;
          let d = b.wicketType || 'out';
          if (b.wicketType === 'caught') {
            d = fielderName ? `c ${fielderName} b ${bowlerName || ''}` : `c b ${bowlerName || ''}`;
          } else if (b.wicketType === 'bowled') {
            d = `b ${bowlerName || ''}`;
          } else if (b.wicketType === 'lbw') {
            d = `lbw b ${bowlerName || ''}`;
          } else if (b.wicketType === 'run_out') {
            d = fielderName ? `run out (${fielderName})` : 'run out';
          } else if (b.wicketType === 'stumped') {
            d = fielderName ? `st ${fielderName} b ${bowlerName || ''}` : `st b ${bowlerName || ''}`;
          }
          battersStats[outId].dismissal = d.trim();
        }
      }
    }

    // Bowler stats
    if (b.bowlerId && bowlersStats[b.bowlerId]) {
      const bwStat = bowlersStats[b.bowlerId];
      if (b.isLegal) {
        bwStat.totalLegalBalls += 1;
        bwStat.overs = Math.floor(bwStat.totalLegalBalls / 6);
        bwStat.ballsInOver = bwStat.totalLegalBalls % 6;
        bwStat.oversFormatted = `${bwStat.overs}.${bwStat.ballsInOver}`;
      }
      if (b.extraType !== 'bye' && b.extraType !== 'leg_bye') {
        bwStat.runs += totalRuns;
        runsInCurrentOver += totalRuns;
      }
      if (b.isWicket && b.wicketType !== 'run_out') {
        bwStat.wickets += 1;
      }
    }

    if (b.innings === room.innings) {
      if (b.isLegal) legalInCurrentOver += 1;

      let hl: 'four' | 'six' | 'wicket' | 'wide' | 'no_ball' | undefined;
      if (b.isWicket) hl = 'wicket';
      else if (b.runsOffBat === 6) hl = 'six';
      else if (b.runsOffBat === 4) hl = 'four';
      else if (b.extraType === 'wide') hl = 'wide';
      else if (b.extraType === 'no_ball') hl = 'no_ball';

      currentOverBalls.push({
        id: b.id,
        runsOffBat: b.runsOffBat,
        extraType: b.extraType,
        extraRuns: b.extraRuns,
        isWicket: b.isWicket,
        wicketType: b.wicketType,
        isLegal: b.isLegal,
        display: formatBallOutcome(b),
        highlight: hl,
      });

      if (legalInCurrentOver >= 6) {
        if (b.bowlerId && bowlersStats[b.bowlerId] && runsInCurrentOver === 0) {
          bowlersStats[b.bowlerId].maidens += 1;
        }
        legalInCurrentOver = 0;
        runsInCurrentOver = 0;
        currentOverBalls.length = 0;
      }
    }
  }

  // Last 6 balls across entire current innings
  const currentInningsBalls = balls.filter((b) => b.innings === room.innings);
  const last6Balls = currentInningsBalls.slice(-6).map((b) => {
    let hl: 'four' | 'six' | 'wicket' | 'wide' | 'no_ball' | undefined;
    if (b.isWicket) hl = 'wicket';
    else if (b.runsOffBat === 6) hl = 'six';
    else if (b.runsOffBat === 4) hl = 'four';
    else if (b.extraType === 'wide') hl = 'wide';
    else if (b.extraType === 'no_ball') hl = 'no_ball';

    return {
      id: b.id,
      display: formatBallOutcome(b),
      highlight: hl,
      isLegal: b.isLegal,
    };
  });

  // Crease details
  const striker = room.currentBatterId && battersStats[room.currentBatterId]
    ? battersStats[room.currentBatterId]
    : null;

  const nonStriker = room.currentNonStrikerId && battersStats[room.currentNonStrikerId]
    ? battersStats[room.currentNonStrikerId]
    : null;

  const bowler = room.currentBowlerId && bowlersStats[room.currentBowlerId]
    ? bowlersStats[room.currentBowlerId]
    : null;

  // Active run rates & chase calculations
  const activeBattingBalls = room.legalBallsInInnings || 0;
  const activeBattingRuns = room.battingTeam === 'teamA' ? room.scoreA : room.scoreB;
  const currentOversFormatted = `${Math.floor(activeBattingBalls / 6)}.${activeBattingBalls % 6}`;

  const currentRunRate =
    activeBattingBalls > 0
      ? Number(((activeBattingRuns / activeBattingBalls) * 6).toFixed(2))
      : 0;

  let requiredRunRate: number | null = null;
  let runsNeeded: number | null = null;
  let ballsRemaining: number | null = null;
  let chaseText: string | null = null;

  if (room.innings === 2 && room.target != null) {
    runsNeeded = Math.max(0, room.target - activeBattingRuns);
    const totalInningsBalls = room.oversPerInnings * 6;
    ballsRemaining = Math.max(0, totalInningsBalls - activeBattingBalls);

    requiredRunRate =
      ballsRemaining > 0
        ? Number(((runsNeeded / ballsRemaining) * 6).toFixed(2))
        : runsNeeded > 0
        ? 99.99
        : 0;

    if (runsNeeded > 0 && ballsRemaining > 0) {
      chaseText = `Need ${runsNeeded} from ${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'}`;
    } else if (runsNeeded === 0) {
      chaseText = `Target reached!`;
    }
  }

  // Football Goals Timeline
  const goalsTimeline = goalEvents.map((g) => ({
    id: g.id,
    team: g.team,
    scorerName: g.scorerId ? playerMap.get(g.scorerId)?.name || 'Player' : null,
    assistName: g.assistId ? playerMap.get(g.assistId)?.name || null : null,
    goalType: g.goalType,
    minute: g.minute,
    half: g.half,
    period: g.period,
    commentary: g.commentary,
  }));

  // Commentary list (newest first)
  const commentaryList: Array<{
    id: string;
    text: string;
    kind: string;
    timestamp: number;
    team: string;
  }> = [];

  // Add ball commentary
  for (const b of balls) {
    if (b.commentary) {
      let kind = 'dot';
      if (b.isWicket) kind = 'wicket';
      else if (b.runsOffBat === 6) kind = 'six';
      else if (b.runsOffBat === 4) kind = 'four';
      else if (b.extraType === 'wide') kind = 'wide';
      else if (b.extraType === 'no_ball') kind = 'no_ball';
      else if (b.extraType === 'bye') kind = 'bye';
      else if (b.extraType === 'leg_bye') kind = 'leg_bye';
      else if (b.runsOffBat === 1) kind = 'single';
      else if (b.runsOffBat === 2) kind = 'two';
      else if (b.runsOffBat === 3) kind = 'three';

      commentaryList.push({
        id: b.id,
        text: b.commentary,
        kind,
        timestamp: b.createdAt.getTime(),
        team: b.team,
      });
    }
  }

  // Add goal commentary
  for (const g of goalEvents) {
    if (g.commentary) {
      commentaryList.push({
        id: g.id,
        text: g.commentary,
        kind: g.goalType,
        timestamp: g.createdAt.getTime(),
        team: g.team,
      });
    }
  }

  // Sort commentary newest first
  commentaryList.sort((a, b) => b.timestamp - a.timestamp);

  // Latest commentary
  const latestCommentary = commentaryList.length > 0 ? commentaryList[0].text : null;

  const ruleSummary = getRuleSummary(room);

  return {
    code: room.code,
    sport: room.sport,
    createdAt: room.createdAt.getTime(),
    status: (room.phase === 'finished' ? 'finished' : 'live') as 'live' | 'finished',
    phase: room.phase,
    revision: room.revision,
    hostDeviceId: room.hostDeviceId || null,

    teamA: {
      id: 'teamA' as const,
      name: room.teamAName,
      color: room.teamAColor || '#2563EB',
      players: playersA,
      hasRoster: playersA.length > 0,
      cricketScore: isCricket
        ? {
            runs: room.scoreA,
            wickets: room.wicketsA,
            overs: room.battingTeam === 'teamA' ? activeBattingBalls / 6 : 0,
            balls: room.battingTeam === 'teamA' ? activeBattingBalls : 0,
            fours: Object.values(battersStats)
              .filter((b) => playerMap.get(b.id)?.team === 'teamA')
              .reduce((acc, curr) => acc + curr.fours, 0),
            sixes: Object.values(battersStats)
              .filter((b) => playerMap.get(b.id)?.team === 'teamA')
              .reduce((acc, curr) => acc + curr.sixes, 0),
            extras: 0,
            runRate: currentRunRate,
          }
        : undefined,
      footballScore: !isCricket
        ? {
            goals: room.scoreA,
            shootoutGoals: room.shootoutScoreA,
            yellowCards: 0,
            redCards: 0,
            corners: 0,
            fouls: 0,
          }
        : undefined,
    },

    teamB: {
      id: 'teamB' as const,
      name: room.teamBName,
      color: room.teamBColor || '#DC2626',
      players: playersB,
      hasRoster: playersB.length > 0,
      cricketScore: isCricket
        ? {
            runs: room.scoreB,
            wickets: room.wicketsB,
            overs: room.battingTeam === 'teamB' ? activeBattingBalls / 6 : 0,
            balls: room.battingTeam === 'teamB' ? activeBattingBalls : 0,
            fours: Object.values(battersStats)
              .filter((b) => playerMap.get(b.id)?.team === 'teamB')
              .reduce((acc, curr) => acc + curr.fours, 0),
            sixes: Object.values(battersStats)
              .filter((b) => playerMap.get(b.id)?.team === 'teamB')
              .reduce((acc, curr) => acc + curr.sixes, 0),
            extras: 0,
            runRate: currentRunRate,
          }
        : undefined,
      footballScore: !isCricket
        ? {
            goals: room.scoreB,
            shootoutGoals: room.shootoutScoreB,
            yellowCards: 0,
            redCards: 0,
            corners: 0,
            fouls: 0,
          }
        : undefined,
    },

    claims: {
      teamA: room.teamAClaimToken || null,
      teamB: room.teamBClaimToken || null,
    },
    tossWinner: (room.tossWinner as 'teamA' | 'teamB' | null) || null,
    tossChoice: (room.tossChoice as any) || null,
    battingTeam: (room.battingTeam as 'teamA' | 'teamB' | null) || null,

    rules: {
      oversPerInnings: room.oversPerInnings,
      playersPerSide: room.playersPerSide,
      maxWickets: room.maxWickets,
      wideNoBallRerun: room.wideNoBallRerun,
      halfMinutes: room.halfMinutes,
      halves: room.halves,
      drawRule: room.drawRule,
      mercyGoalLead: room.mercyGoalLead,
      ruleSummary,
    },

    cricketState: isCricket
      ? {
          innings: room.innings,
          legalBallsInInnings: room.legalBallsInInnings,
          oversFormatted: currentOversFormatted,
          currentRunRate,
          firstInningsRuns: room.firstInningsRuns,
          firstInningsWickets: room.firstInningsWickets,
          target: room.target,
          runsNeeded,
          ballsRemaining,
          requiredRunRate,
          chaseText,
          currentOverDots: currentOverBalls,
          last6Balls,
          crease: {
            striker,
            nonStriker,
            bowler,
            currentBatterId: room.currentBatterId,
            currentNonStrikerId: room.currentNonStrikerId,
            currentBowlerId: room.currentBowlerId,
            hasNames: players.length > 0,
          },
          batters: battersStats,
          bowlers: bowlersStats,
        }
      : null,

    footballState: !isCricket
      ? {
          currentHalf: room.currentHalf,
          clockRunning: room.clockRunning,
          clockAccumulatedMs: room.clockAccumulatedMs,
          clockLastStartedAt: room.clockLastStartedAt
            ? room.clockLastStartedAt.toISOString()
            : null,
          shootoutScoreA: room.shootoutScoreA,
          shootoutScoreB: room.shootoutScoreB,
          goalsTimeline,
        }
      : null,

    result: {
      winner: (room.resultWinner as 'teamA' | 'teamB' | 'draw' | 'tie' | null) || null,
      resultText: room.resultText || null,
      finishedAt: room.finishedAt ? room.finishedAt.toISOString() : null,
      endedReason: room.endedReason || null,
    },

    commentary: commentaryList,
    latestCommentary,
    lastEvent: lastEventOverride || room.lastEventJson || null,

    lastUpdated: room.updatedAt.getTime(),
    qrImageBase64,
  };
}
