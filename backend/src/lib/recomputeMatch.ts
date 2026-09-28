import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma.js';

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
  overs: number; // full overs
  ballsInOver: number; // 0..5
  totalLegalBalls: number;
  oversFormatted: string; // e.g. "1.4"
  runs: number;
  wickets: number;
  maidens: number;
}

export interface CricketLivePlayerStats {
  batters: Record<string, BatterStats>;
  bowlers: Record<string, BowlerStats>;
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  lastOverBowlerId: string | null;
  overBalls: Array<{
    runsOffBat: number;
    extraType: string;
    extraRuns: number;
    isWicket: boolean;
    wicketType?: string | null;
    isLegal: boolean;
    display: string;
  }>;
}

/**
 * Format a single ball display label (e.g. "0", "1", "4", "6", "W", "Wd", "Nb+1")
 */
export function formatBallOutcome(ball: {
  runsOffBat: number;
  extraType: string;
  extraRuns: number;
  isWicket: boolean;
}): string {
  if (ball.isWicket) return 'W';
  if (ball.extraType === 'wide') {
    return ball.extraRuns > 1 ? `Wd+${ball.extraRuns - 1}` : 'Wd';
  }
  if (ball.extraType === 'no_ball') {
    const total = ball.runsOffBat + ball.extraRuns;
    return total > 1 ? `Nb+${total - 1}` : 'Nb';
  }
  if (ball.extraType === 'bye') {
    return ball.extraRuns > 0 ? `B${ball.extraRuns}` : 'B';
  }
  if (ball.extraType === 'leg_bye') {
    return ball.extraRuns > 0 ? `Lb${ball.extraRuns}` : 'Lb';
  }
  return String(ball.runsOffBat);
}

/**
 * Recomputes all match totals, player stats, crease, and phase from non-deleted events.
 * This is the SINGLE SOURCE OF TRUTH called inside every score and undo operation.
 */
export async function recomputeMatch(
  roomId: string,
  txClient?: Prisma.TransactionClient,
  overrideCrease?: {
    strikerId?: string | null;
    nonStrikerId?: string | null;
    bowlerId?: string | null;
  }
) {
  const db = txClient || prisma;

  // 1. Fetch current room, players, active balls and active goal events
  const room = await db.room.findUniqueOrThrow({
    where: { id: roomId },
    include: {
      players: { orderBy: { position: 'asc' } },
      balls: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }],
      },
      goalEvents: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }],
      },
    },
  });

  const isCricket = room.sport === 'cricket';

  if (isCricket) {
    return await recomputeCricket(db, room, overrideCrease);
  } else {
    return await recomputeFootball(db, room);
  }
}

async function recomputeCricket(
  db: Prisma.TransactionClient | PrismaClient,
  room: any,
  overrideCrease?: {
    strikerId?: string | null;
    nonStrikerId?: string | null;
    bowlerId?: string | null;
  }
) {
  const players = room.players;
  const playerMap = new Map<string, any>(players.map((p: any) => [p.id, p]));

  // Initialize player stats
  const batters: Record<string, BatterStats> = {};
  const bowlers: Record<string, BowlerStats> = {};

  for (const p of players) {
    batters[p.id] = {
      id: p.id,
      name: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissal: null,
    };
    bowlers[p.id] = {
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

  let scoreA = 0;
  let wicketsA = 0;
  let scoreB = 0;
  let wicketsB = 0;

  // Crease tracking
  let strikerId: string | null = overrideCrease?.strikerId !== undefined
    ? overrideCrease.strikerId
    : room.currentBatterId;
  let nonStrikerId: string | null = overrideCrease?.nonStrikerId !== undefined
    ? overrideCrease.nonStrikerId
    : room.currentNonStrikerId;
  let bowlerId: string | null = overrideCrease?.bowlerId !== undefined
    ? overrideCrease.bowlerId
    : room.currentBowlerId;
  let lastOverBowlerId: string | null = null;

  // Current over balls for display
  const currentOverBalls: Array<{
    runsOffBat: number;
    extraType: string;
    extraRuns: number;
    isWicket: boolean;
    wicketType?: string | null;
    isLegal: boolean;
    display: string;
  }> = [];

  let legalBallsInCurrentInnings = 0;
  let legalBallsInCurrentOver = 0;
  let runsConcededInCurrentOver = 0;

  const balls = room.balls;

  for (const ball of balls) {
    const isTeamA = ball.team === 'teamA';
    const totalBallRuns = ball.runsOffBat + ball.extraRuns;

    if (isTeamA) {
      scoreA += totalBallRuns;
      if (ball.isWicket) wicketsA += 1;
    } else {
      scoreB += totalBallRuns;
      if (ball.isWicket) wicketsB += 1;
    }

    // Batter stats
    if (ball.batterId && batters[ball.batterId]) {
      const bStat = batters[ball.batterId];
      bStat.runs += ball.runsOffBat;
      if (ball.extraType !== 'wide') {
        bStat.balls += 1;
      }
      if (ball.runsOffBat === 4) bStat.fours += 1;
      if (ball.runsOffBat === 6) bStat.sixes += 1;

      if (ball.isWicket) {
        const outPlayerId = ball.dismissedPlayerId || ball.batterId;
        if (batters[outPlayerId]) {
          batters[outPlayerId].isOut = true;
          const bowlerName = ball.bowlerId && playerMap.get(ball.bowlerId)?.name;
          const fielderName = ball.fielderId && playerMap.get(ball.fielderId)?.name;

          let desc = ball.wicketType || 'out';
          if (ball.wicketType === 'caught') {
            desc = fielderName ? `c ${fielderName} b ${bowlerName || ''}` : `caught b ${bowlerName || ''}`;
          } else if (ball.wicketType === 'bowled') {
            desc = `b ${bowlerName || ''}`;
          } else if (ball.wicketType === 'lbw') {
            desc = `lbw b ${bowlerName || ''}`;
          } else if (ball.wicketType === 'run_out') {
            desc = fielderName ? `run out (${fielderName})` : 'run out';
          } else if (ball.wicketType === 'stumped') {
            desc = fielderName ? `st ${fielderName} b ${bowlerName || ''}` : `stumped b ${bowlerName || ''}`;
          }
          batters[outPlayerId].dismissal = desc.trim();
        }
      }
    }

    // Bowler stats
    if (ball.bowlerId && bowlers[ball.bowlerId]) {
      const bwStat = bowlers[ball.bowlerId];
      if (ball.isLegal) {
        bwStat.totalLegalBalls += 1;
        bwStat.overs = Math.floor(bwStat.totalLegalBalls / 6);
        bwStat.ballsInOver = bwStat.totalLegalBalls % 6;
        bwStat.oversFormatted = `${bwStat.overs}.${bwStat.ballsInOver}`;
      }
      // Bowler runs conceded (exclude byes / leg byes)
      if (ball.extraType !== 'bye' && ball.extraType !== 'leg_bye') {
        bwStat.runs += totalBallRuns;
        runsConcededInCurrentOver += totalBallRuns;
      }
      // Wickets credited to bowler (exclude run out)
      if (ball.isWicket && ball.wicketType !== 'run_out') {
        bwStat.wickets += 1;
      }
    }

    // If ball belongs to the current active innings
    if (ball.innings === room.innings) {
      if (ball.isLegal) {
        legalBallsInCurrentInnings += 1;
        legalBallsInCurrentOver += 1;
      }

      currentOverBalls.push({
        runsOffBat: ball.runsOffBat,
        extraType: ball.extraType,
        extraRuns: ball.extraRuns,
        isWicket: ball.isWicket,
        wicketType: ball.wicketType,
        isLegal: ball.isLegal,
        display: formatBallOutcome(ball),
      });

      // Strike swap on odd runs:
      // Odd runs off the bat, or odd bye/leg-bye runs (run between wickets)
      const isOddRuns = (ball.runsOffBat % 2 === 1) ||
        ((ball.extraType === 'bye' || ball.extraType === 'leg_bye') && (ball.extraRuns % 2 === 1));

      if (ball.batterId && ball.nonStrikerId) {
        strikerId = ball.batterId;
        nonStrikerId = ball.nonStrikerId;
      }

      if (isOddRuns && strikerId && nonStrikerId) {
        const temp = strikerId;
        strikerId = nonStrikerId;
        nonStrikerId = temp;
      }

      // If wicket fell, dismissed player leaves crease
      if (ball.isWicket) {
        const outId = ball.dismissedPlayerId || ball.batterId;
        if (strikerId === outId) strikerId = null;
        if (nonStrikerId === outId) nonStrikerId = null;
      }

      // Check if over completed (6 legal balls)
      if (legalBallsInCurrentOver >= 6) {
        // Maiden check
        if (ball.bowlerId && bowlers[ball.bowlerId] && runsConcededInCurrentOver === 0) {
          bowlers[ball.bowlerId].maidens += 1;
        }

        lastOverBowlerId = ball.bowlerId;
        bowlerId = null; // Reset bowler for next over so fielding team picks
        legalBallsInCurrentOver = 0;
        runsConcededInCurrentOver = 0;
        currentOverBalls.length = 0; // reset current over dots for next over

        // Strike swaps at the end of the over
        if (strikerId && nonStrikerId) {
          const temp = strikerId;
          strikerId = nonStrikerId;
          nonStrikerId = temp;
        }
      }
    }
  }

  // Determine active batting team and values
  const activeBattingTeam = room.battingTeam || 'teamA';
  const activeRuns = activeBattingTeam === 'teamA' ? scoreA : scoreB;
  const activeWickets = activeBattingTeam === 'teamA' ? wicketsA : wicketsB;
  const maxWickets = room.maxWickets || 10;
  const totalInningsBalls = room.oversPerInnings * 6;

  let phase = room.phase;
  let resultWinner = room.resultWinner;
  let resultText = room.resultText;
  let endedReason = room.endedReason;
  let finishedAt = room.finishedAt;
  let firstInningsRuns = room.firstInningsRuns;
  let firstInningsWickets = room.firstInningsWickets;
  let target = room.target;
  let innings = room.innings;

  // AUTO-END / INNINGS BREAK RECOMPUTATION
  if (phase === 'in_progress' || phase === 'innings_break' || phase === 'finished') {
    if (innings === 1) {
      const innings1Ended = activeWickets >= maxWickets || legalBallsInCurrentInnings >= totalInningsBalls;
      if (innings1Ended) {
        phase = 'innings_break';
        firstInningsRuns = activeRuns;
        firstInningsWickets = activeWickets;
        target = firstInningsRuns + 1;
      } else {
        // If undo occurred while in innings_break or finished, revert to in_progress!
        if (phase === 'innings_break' || phase === 'finished') {
          phase = 'in_progress';
          firstInningsRuns = null;
          firstInningsWickets = null;
          target = null;
          resultWinner = null;
          resultText = null;
          endedReason = null;
          finishedAt = null;
        }
      }
    } else if (innings === 2) {
      const chasingTeam = activeBattingTeam;
      const bowlingTeam = chasingTeam === 'teamA' ? 'teamB' : 'teamA';
      const chasingName = chasingTeam === 'teamA' ? room.teamAName : room.teamBName;
      const bowlingName = bowlingTeam === 'teamA' ? room.teamAName : room.teamBName;
      const requiredTarget = target || (firstInningsRuns != null ? firstInningsRuns + 1 : 1);

      if (activeRuns >= requiredTarget) {
        // Chasing team won!
        phase = 'finished';
        resultWinner = chasingTeam;
        const wicketsRemaining = maxWickets - activeWickets;
        resultText = `${chasingName} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
        endedReason = 'target_chased';
        finishedAt = finishedAt || new Date();
      } else if (activeWickets >= maxWickets || legalBallsInCurrentInnings >= totalInningsBalls) {
        // Chasing team all out or overs complete
        phase = 'finished';
        finishedAt = finishedAt || new Date();
        endedReason = activeWickets >= maxWickets ? 'all_out' : 'overs_complete';

        if (activeRuns === requiredTarget - 1) {
          resultWinner = 'tie';
          resultText = `Match tied (${activeRuns} – ${firstInningsRuns})`;
        } else {
          resultWinner = bowlingTeam;
          const margin = (firstInningsRuns || 0) - activeRuns;
          resultText = `${bowlingName} won by ${margin} run${margin === 1 ? '' : 's'}`;
        }
      } else {
        // If it was marked finished but undo restored it:
        if (phase === 'finished') {
          phase = 'in_progress';
          resultWinner = null;
          resultText = null;
          endedReason = null;
          finishedAt = null;
        }
      }
    }
  }

  // Update room in DB
  const updatedRoom = await db.room.update({
    where: { id: room.id },
    data: {
      scoreA,
      scoreB,
      wicketsA,
      wicketsB,
      legalBallsInInnings: legalBallsInCurrentInnings,
      firstInningsRuns,
      firstInningsWickets,
      target,
      innings,
      phase,
      resultWinner,
      resultText,
      endedReason,
      finishedAt,
      currentBatterId: strikerId,
      currentNonStrikerId: nonStrikerId,
      currentBowlerId: bowlerId,
      revision: { increment: 1 },
    },
    include: {
      events: true,
      players: { orderBy: { position: 'asc' } },
      balls: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }],
      },
      goalEvents: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }],
      },
    },
  });

  const liveStats: CricketLivePlayerStats = {
    batters,
    bowlers,
    strikerId,
    nonStrikerId,
    bowlerId,
    lastOverBowlerId,
    overBalls: currentOverBalls,
  };

  return { room: updatedRoom, cricketStats: liveStats };
}

async function recomputeFootball(
  db: Prisma.TransactionClient | PrismaClient,
  room: any
) {
  let scoreA = 0;
  let scoreB = 0;
  let shootoutScoreA = 0;
  let shootoutScoreB = 0;

  for (const g of room.goalEvents) {
    if (g.period === 'shootout') {
      if (g.team === 'teamA') shootoutScoreA += 1;
      else shootoutScoreB += 1;
    } else {
      if (g.team === 'teamA') scoreA += 1;
      else scoreB += 1;
    }
  }

  let phase = room.phase;
  let resultWinner = room.resultWinner;
  let resultText = room.resultText;
  let endedReason = room.endedReason;
  let finishedAt = room.finishedAt;

  // Mercy rule check
  if (room.mercyGoalLead && room.mercyGoalLead > 0 && phase === 'in_progress') {
    const diff = Math.abs(scoreA - scoreB);
    if (diff >= room.mercyGoalLead) {
      phase = 'finished';
      const winner = scoreA > scoreB ? 'teamA' : 'teamB';
      const winnerName = winner === 'teamA' ? room.teamAName : room.teamBName;
      resultWinner = winner;
      resultText = `${winnerName} won by Mercy Rule (+${diff} goals lead)`;
      endedReason = 'mercy_rule';
      finishedAt = finishedAt || new Date();
    }
  }

  const updatedRoom = await db.room.update({
    where: { id: room.id },
    data: {
      scoreA,
      scoreB,
      shootoutScoreA,
      shootoutScoreB,
      phase,
      resultWinner,
      resultText,
      endedReason,
      finishedAt,
      revision: { increment: 1 },
    },
    include: {
      events: true,
      players: { orderBy: { position: 'asc' } },
      balls: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }],
      },
      goalEvents: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }],
      },
    },
  });

  return { room: updatedRoom };
}
