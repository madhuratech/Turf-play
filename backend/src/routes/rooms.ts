import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import type { RoomPhase } from '@prisma/client';
import { serializeRoom } from '../lib/roomSerializer.js';
import { recomputeMatch } from '../lib/recomputeMatch.js';
import {
  generateCricketCommentary,
  generateFootballCommentary,
} from '../lib/commentary.js';
import {
  emitClaimUpdated,
  emitPhaseChanged,
  emitScoreUpdated,
  emitEventUndone,
} from '../sockets/index.js';
import {
  scheduleFootballTimer,
  clearRoomTimer,
  handleFootballTimeUp,
} from '../lib/clockManager.js';

const router = Router();

export const roomInclude = {
  events: true,
  players: { orderBy: { position: 'asc' as const } },
  balls: {
    where: { deletedAt: null },
    orderBy: [{ createdAt: 'asc' as const }, { seq: 'asc' as const }],
  },
  goalEvents: {
    where: { deletedAt: null },
    orderBy: [{ createdAt: 'asc' as const }, { seq: 'asc' as const }],
  },
};

function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function normalizeTeam(team: string): 'teamA' | 'teamB' {
  if (team === 'A' || team === 'teamA') return 'teamA';
  if (team === 'B' || team === 'teamB') return 'teamB';
  return 'teamA';
}

/**
 * POST /rooms — body: { sport, teamAName, teamBName, hostDeviceId, rules, teamAColor, teamBColor }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sport = 'cricket',
      teamAName = 'Team A',
      teamBName = 'Team B',
      hostDeviceId,
      rules = {},
      teamAColor = '#2563EB',
      teamBColor = '#DC2626',
    } = req.body;

    const chosenSport = sport === 'football' ? 'football' : 'cricket';

    // Cricket rule validations
    let oversPerInnings = 5;
    let playersPerSide = 11;
    let wideNoBallRerun = true;

    // Football rule validations
    let halfMinutes = 15;
    let halves = 2;
    let drawRule: 'draw' | 'golden_goal' | 'shootout' = 'draw';
    let mercyGoalLead: number | null = null;

    if (chosenSport === 'cricket') {
      if (typeof rules.oversPerInnings === 'number') {
        oversPerInnings = Math.max(1, Math.min(50, Math.round(rules.oversPerInnings)));
      }
      if (typeof rules.playersPerSide === 'number') {
        playersPerSide = Math.max(5, Math.min(11, Math.round(rules.playersPerSide)));
      }
      if (typeof rules.wideNoBallRerun === 'boolean') {
        wideNoBallRerun = rules.wideNoBallRerun;
      }
    } else {
      if (typeof rules.halfMinutes === 'number') {
        halfMinutes = Math.max(1, Math.min(90, Math.round(rules.halfMinutes)));
      }
      if (typeof rules.halves === 'number') {
        halves = rules.halves === 1 ? 1 : 2;
      }
      if (typeof rules.playersPerSide === 'number') {
        const allowed = [5, 6, 7, 9, 11];
        playersPerSide = allowed.includes(rules.playersPerSide) ? rules.playersPerSide : 11;
      }
      if (['draw', 'golden_goal', 'shootout'].includes(rules.drawRule)) {
        drawRule = rules.drawRule;
      }
      if (rules.mercyGoalLead != null && typeof rules.mercyGoalLead === 'number' && rules.mercyGoalLead > 0) {
        mercyGoalLead = Math.round(rules.mercyGoalLead);
      }
    }

    const maxWickets = playersPerSide - 1;

    let code = generateRoomCode();
    let exists = await prisma.room.findUnique({ where: { code } });
    while (exists) {
      code = generateRoomCode();
      exists = await prisma.room.findUnique({ where: { code } });
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${frontendBase}/room/${code}`;
    const qrImageBase64 = await QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const room = await prisma.room.create({
      data: {
        code,
        sport: chosenSport,
        teamAName: teamAName.trim() || 'Team A',
        teamBName: teamBName.trim() || 'Team B',
        teamAColor,
        teamBColor,
        hostDeviceId: hostDeviceId || null,
        phase: 'waiting_for_opponent',
        oversPerInnings,
        playersPerSide,
        maxWickets,
        wideNoBallRerun,
        halfMinutes,
        halves,
        drawRule,
        mercyGoalLead,
      },
      include: roomInclude,
    });

    const serialized = serializeRoom(room, qrImageBase64);
    res.status(201).json(serialized);
  } catch (err: any) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

/**
 * GET /rooms/:code — current room state
 */
router.get('/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ error: `Room ${cleanCode} not found` });
      return;
    }

    // Football clock auto-check: if clock was running and time expired
    if (
      room.sport === 'football' &&
      room.clockRunning &&
      room.clockLastStartedAt &&
      (room.phase === 'in_progress' || room.phase === 'extra_time')
    ) {
      const now = Date.now();
      const elapsed =
        room.clockAccumulatedMs + (now - room.clockLastStartedAt.getTime());
      const maxMs =
        (room.phase === 'extra_time' ? 5 : room.halfMinutes) * 60 * 1000;

      if (elapsed >= maxMs) {
        await handleFootballTimeUp(cleanCode);
        const refreshed = await prisma.room.findUnique({
          where: { code: cleanCode },
          include: roomInclude,
        });
        if (refreshed) {
          const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
          const joinUrl = `${frontendBase}/room/${cleanCode}`;
          const qrImageBase64 = await QRCode.toDataURL(joinUrl, { margin: 1, width: 256 });
          res.json(serializeRoom(refreshed, qrImageBase64));
          return;
        }
      }
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${frontendBase}/room/${cleanCode}`;
    const qrImageBase64 = await QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 256,
    });

    const serialized = serializeRoom(room, qrImageBase64);
    res.json(serialized);
  } catch (err: any) {
    console.error('Error fetching room:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch room' });
  }
});

/**
 * POST /rooms/:code/claim — body: { team: 'A'|'B', deviceId }
 */
router.post('/:code/claim', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { team, deviceId } = req.body;

    if (!team || !deviceId) {
      res.status(400).json({ error: 'Team and deviceId are required' });
      return;
    }

    const targetTeam = normalizeTeam(team);
    const tokenField = targetTeam === 'teamA' ? 'teamAClaimToken' : 'teamBClaimToken';

    const updatedRoom = await prisma.$transaction(async (tx) => {
      const existing = await tx.room.findUnique({
        where: { code: cleanCode },
        include: roomInclude,
      });

      if (!existing) {
        throw new Error('ROOM_NOT_FOUND');
      }

      const currentClaim = existing[tokenField];
      if (currentClaim && currentClaim !== deviceId) {
        throw new Error('ALREADY_CLAIMED');
      }

      const newClaimA = targetTeam === 'teamA' ? deviceId : existing.teamAClaimToken;
      const newClaimB = targetTeam === 'teamB' ? deviceId : existing.teamBClaimToken;
      const bothClaimed = Boolean(newClaimA && newClaimB);

      let newPhase = existing.phase;
      if (bothClaimed && existing.phase === 'waiting_for_opponent') {
        newPhase = 'toss_pending';
      }

      return tx.room.update({
        where: { code: cleanCode },
        data: {
          [tokenField]: deviceId,
          phase: newPhase,
          revision: { increment: 1 },
        },
        include: roomInclude,
      });
    });

    const serialized = serializeRoom(updatedRoom);
    emitClaimUpdated(cleanCode, serialized);

    if (serialized.phase === 'toss_pending') {
      emitPhaseChanged(cleanCode, serialized);
    }

    res.json({ success: true, room: serialized });
  } catch (err: any) {
    if (err.message === 'ROOM_NOT_FOUND') {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }
    if (err.message === 'ALREADY_CLAIMED') {
      res.status(409).json({
        success: false,
        code: 'ALREADY_CLAIMED',
        error: 'This team is already being scored by another device.',
      });
      return;
    }
    console.error('Error claiming team:', err);
    res.status(500).json({ success: false, error: err.message || 'Claim failed' });
  }
});

/**
 * PUT /rooms/:code/players — Squad management
 * Body: { deviceId, team: 'A'|'B', names: string[] }
 */
router.put('/:code/players', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId, team } = req.body;
    const names = req.body.names || req.body.playerNames;

    if (!deviceId || !team || !Array.isArray(names)) {
      res.status(400).json({ success: false, error: 'deviceId, team, and names array required' });
      return;
    }

    const targetTeam = normalizeTeam(team);

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    if (room.phase === 'finished') {
      res.status(400).json({
        success: false,
        code: 'ROSTER_LOCKED_MATCH_FINISHED',
        error: 'Rosters lock for editing once the match is finished.',
      });
      return;
    }

    const claimToken = targetTeam === 'teamA' ? room.teamAClaimToken : room.teamBClaimToken;
    if (claimToken !== deviceId) {
      res.status(403).json({
        success: false,
        code: 'NOT_YOUR_TEAM',
        error: 'Only the scorer of this team can edit its squad.',
      });
      return;
    }

    // Validate names: max playersPerSide, trimmed, max 20 chars, no duplicates within a team
    const maxEntries = room.playersPerSide || 11;
    const trimmed = names
      .slice(0, maxEntries)
      .map((n: any) => String(n || '').trim())
      .filter(Boolean);

    // Duplicates check
    const lowerSet = new Set<string>();
    for (const n of trimmed) {
      const lower = n.toLowerCase();
      if (lowerSet.has(lower)) {
        res.status(400).json({
          success: false,
          code: 'DUPLICATE_NAME',
          error: `Duplicate player name within team: "${n}"`,
        });
        return;
      }
      lowerSet.add(lower);
    }

    // Upsert / replace players for this team in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.player.deleteMany({
        where: { roomId: room.id, team: targetTeam },
      });

      for (let i = 0; i < trimmed.length; i++) {
        await tx.player.create({
          data: {
            roomId: room.id,
            team: targetTeam,
            name: trimmed[i].slice(0, 20),
            position: i,
          },
        });
      }

      await tx.room.update({
        where: { id: room.id },
        data: { revision: { increment: 1 } },
      });
    });

    const { room: updatedRoom } = await recomputeMatch(room.id);
    const serialized = serializeRoom(updatedRoom);
    emitScoreUpdated(cleanCode, serialized);

    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error updating players:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update squad' });
  }
});

/**
 * POST /rooms/:code/crease — Set striker, non-striker, or bowler, or swap strike
 * Body: { deviceId, strikerId?, nonStrikerId?, bowlerId?, swapStrike?: boolean }
 */
router.post('/:code/crease', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId, strikerId, nonStrikerId, bowlerId, swapStrike } = req.body;

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const battingTeam = room.battingTeam || 'teamA';
    const fieldingTeam = battingTeam === 'teamA' ? 'teamB' : 'teamA';
    const battingClaim = battingTeam === 'teamA' ? room.teamAClaimToken : room.teamBClaimToken;
    const fieldingClaim = fieldingTeam === 'teamA' ? room.teamAClaimToken : room.teamBClaimToken;

    // Bowler assignment belongs to fielding scorer!
    if (bowlerId !== undefined) {
      if (fieldingClaim !== deviceId && battingClaim !== deviceId) {
        res.status(403).json({
          success: false,
          code: 'NOT_YOUR_TEAM',
          error: 'Setting the bowler belongs to the fielding team scorer.',
        });
        return;
      }

      // Check consecutive overs rule
      const rec = (await recomputeMatch(room.id)) as any;
      if (
        rec.cricketStats?.lastOverBowlerId &&
        bowlerId &&
        bowlerId === rec.cricketStats.lastOverBowlerId
      ) {
        res.status(400).json({
          success: false,
          code: 'CONSECUTIVE_OVER_BOWLER',
          error: 'The same bowler cannot bowl consecutive overs.',
        });
        return;
      }
    }

    // Striker, nonStriker, and swapStrike belong to batting scorer
    if (strikerId !== undefined || nonStrikerId !== undefined || swapStrike) {
      if (battingClaim !== deviceId) {
        res.status(403).json({
          success: false,
          code: 'NOT_YOUR_TEAM',
          error: 'Crease striker selection belongs to the batting team scorer.',
        });
        return;
      }
    }

    let nextStriker = strikerId !== undefined ? strikerId : room.currentBatterId;
    let nextNonStriker = nonStrikerId !== undefined ? nonStrikerId : room.currentNonStrikerId;
    let nextBowler = bowlerId !== undefined ? bowlerId : room.currentBowlerId;

    if (swapStrike) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    const { room: updatedRoom } = await recomputeMatch(room.id, undefined, {
      strikerId: nextStriker,
      nonStrikerId: nextNonStriker,
      bowlerId: nextBowler,
    });

    const serialized = serializeRoom(updatedRoom);
    emitScoreUpdated(cleanCode, serialized);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error updating crease:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update crease' });
  }
});

/**
 * POST /rooms/:code/toss — body: { deviceId }
 */
router.post('/:code/toss', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId } = req.body;

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase !== 'toss_pending') {
      res.status(400).json({ success: false, code: 'WRONG_PHASE', error: 'Toss is not currently pending' });
      return;
    }

    const isEditor = room.teamAClaimToken === deviceId || room.teamBClaimToken === deviceId;
    if (!isEditor) {
      res.status(403).json({ success: false, code: 'NOT_YOUR_TEAM', error: 'Only a team editor can flip the coin.' });
      return;
    }

    const winner: 'teamA' | 'teamB' = Math.random() < 0.5 ? 'teamA' : 'teamB';
    const winnerName = winner === 'teamA' ? room.teamAName : room.teamBName;

    await prisma.roomEvent.create({
      data: {
        roomId: room.id,
        team: winner,
        eventType: 'extra',
        value: 0,
        label: `🪙 ${winnerName} won the toss`,
      },
    });

    const updatedRoomResult = await prisma.room.update({
      where: { code: cleanCode },
      data: {
        phase: 'toss_result',
        tossWinner: winner,
        revision: { increment: 1 },
      },
      include: roomInclude,
    });

    const serializedResult = serializeRoom(updatedRoomResult);
    emitPhaseChanged(cleanCode, serializedResult);

    setTimeout(async () => {
      try {
        const currentRoom = await prisma.room.findUnique({
          where: { code: cleanCode },
          include: roomInclude,
        });

        if (currentRoom && currentRoom.phase === 'toss_result') {
          const autoAdvanced = await prisma.room.update({
            where: { code: cleanCode },
            data: { phase: 'choice_pending', revision: { increment: 1 } },
            include: roomInclude,
          });

          const serializedChoice = serializeRoom(autoAdvanced);
          emitPhaseChanged(cleanCode, serializedChoice);
        }
      } catch (delayErr) {
        console.error('Error auto-advancing toss to choice:', delayErr);
      }
    }, 1100);

    res.json({ success: true, room: serializedResult });
  } catch (err: any) {
    console.error('Error in toss:', err);
    res.status(500).json({ success: false, error: err.message || 'Toss failed' });
  }
});

/**
 * POST /rooms/:code/toss-choice — body: { deviceId, choice }
 */
router.post('/:code/toss-choice', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId, choice } = req.body;

    if (!choice) {
      res.status(400).json({ success: false, error: 'Choice is required' });
      return;
    }

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase !== 'choice_pending') {
      res.status(400).json({ success: false, code: 'WRONG_PHASE', error: 'Room is not waiting for a toss choice' });
      return;
    }

    const winner = room.tossWinner as 'teamA' | 'teamB' | null;
    const winningClaim = winner === 'teamA' ? room.teamAClaimToken : room.teamBClaimToken;
    if (winningClaim !== deviceId) {
      res.status(403).json({
        success: false,
        code: 'NOT_YOUR_TEAM',
        error: 'Only the toss-winning captain/scorer can make the first choice.',
      });
      return;
    }

    let battingTeam: 'teamA' | 'teamB' | null = null;
    if (room.sport === 'cricket') {
      if (choice === 'bat') {
        battingTeam = winner;
      } else {
        battingTeam = winner === 'teamA' ? 'teamB' : 'teamA';
      }
    }

    const choiceLabelMap: Record<string, string> = {
      bat: 'chose to Bat first',
      bowl: 'chose to Bowl first',
      kickoff: 'chose to Kick off first',
      side: 'chose preferred side',
    };

    const winnerName = winner === 'teamA' ? room.teamAName : room.teamBName;
    const choiceLabel = choiceLabelMap[choice] || `chose ${choice}`;

    await prisma.roomEvent.create({
      data: {
        roomId: room.id,
        team: winner!,
        eventType: 'extra',
        value: 0,
        label: `⚡ ${winnerName} ${choiceLabel}`,
      },
    });

    const updatedRoom = await prisma.room.update({
      where: { code: cleanCode },
      data: {
        tossChoice: choice,
        battingTeam,
        phase: 'in_progress',
        revision: { increment: 1 },
      },
      include: roomInclude,
    });

    const serialized = serializeRoom(updatedRoom);
    emitPhaseChanged(cleanCode, serialized);

    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error submitting toss choice:', err);
    res.status(500).json({ success: false, error: err.message || 'Choice failed' });
  }
});

/**
 * POST /rooms/:code/score — Ball-by-ball cricket scoring & general actions
 * Supports client-generated UUID for idempotency, sequence check, and source of truth recomputation.
 */
router.post('/:code/score', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const {
      deviceId,
      team,
      action,
      id: clientId,
      seq,
      runsOffBat: rawRunsOffBat,
      extraType: rawExtraType,
      extraRuns: rawExtraRuns,
      isWicket: rawIsWicket,
      wicketType: rawWicketType,
      dismissedPlayerId,
      fielderId,
      newBatterId,
    } = req.body;

    const targetTeam = normalizeTeam(team);

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase === 'finished') {
      res.status(400).json({
        success: false,
        code: 'MATCH_FINISHED',
        error: 'This match is finished. Scoring is permanently closed.',
      });
      return;
    }

    if (room.phase !== 'in_progress' && room.phase !== 'extra_time') {
      res.status(400).json({
        success: false,
        code: 'WRONG_PHASE',
        error: `Scoring cannot be recorded during phase: ${room.phase}`,
      });
      return;
    }

    const teamClaimToken = targetTeam === 'teamA' ? room.teamAClaimToken : room.teamBClaimToken;
    if (teamClaimToken !== deviceId) {
      res.status(403).json({
        success: false,
        code: 'NOT_YOUR_TEAM',
        error: 'You do not have scoring permission for this team.',
      });
      return;
    }

    // Cricket innings rule: only batting team's scorer can score balls
    if (room.sport === 'cricket') {
      if (room.battingTeam && targetTeam !== room.battingTeam) {
        const fieldingName = targetTeam === 'teamA' ? room.teamAName : room.teamBName;
        res.status(403).json({
          success: false,
          code: 'NOT_YOUR_TEAM',
          error: `${fieldingName} is currently fielding and cannot score under the innings rule.`,
        });
        return;
      }
    }

    const ballId = clientId || crypto.randomUUID();

    // IDEMPOTENCY CHECK
    const existingBall = await prisma.ball.findUnique({ where: { id: ballId } });
    if (existingBall) {
      res.json({
        success: true,
        idempotent: true,
        room: serializeRoom(room),
      });
      return;
    }

    // SEQUENCE GAP CHECK
    const lastBall = room.balls[room.balls.length - 1];
    const expectedSeq = (lastBall?.seq ?? 0) + 1;
    const finalSeq = seq != null ? Number(seq) : expectedSeq;

    if (seq != null && finalSeq > expectedSeq) {
      res.status(400).json({
        success: false,
        code: 'GAP_IN_SEQUENCE',
        error: `Gap in sequence. Expected seq ${expectedSeq}`,
        expectedSeq,
      });
      return;
    }

    // Resolve parameters from ball-by-ball or legacy action payload
    let runsOffBat = 0;
    let extraType = 'none';
    let extraRuns = 0;
    let isWicket = false;
    let wicketType: string | null = null;
    let isLegal = true;

    if (rawRunsOffBat !== undefined || rawExtraType !== undefined || rawIsWicket !== undefined) {
      runsOffBat = Number(rawRunsOffBat || 0);
      extraType = String(rawExtraType || 'none');
      extraRuns = Number(rawExtraRuns || 0);
      isWicket = Boolean(rawIsWicket);
      wicketType = rawWicketType || null;
      isLegal = extraType === 'wide' || extraType === 'no_ball' ? !room.wideNoBallRerun : true;
    } else if (action) {
      // Legacy action parsing
      const type = action.type;
      if (type === 'CRICKET_DOT') {
        runsOffBat = 0;
        isLegal = true;
      } else if (type === 'CRICKET_RUN') {
        runsOffBat = Number(action.runs || 0);
        isLegal = true;
      } else if (type === 'CRICKET_WICKET') {
        isWicket = true;
        wicketType = action.wicketType || 'bowled';
        isLegal = true;
      } else if (type === 'CRICKET_EXTRA') {
        extraType = action.extraType || 'wide';
        extraRuns = Number(action.runs || 1);
        isLegal = extraType === 'wide' || extraType === 'no_ball' ? !room.wideNoBallRerun : true;
      }
    }

    const currentLegalBalls = room.legalBallsInInnings || 0;
    const overNumber = Math.floor(currentLegalBalls / 6);
    const ballInOver = (currentLegalBalls % 6) + (isLegal ? 1 : 0);

    const batterId = room.currentBatterId || null;
    const nonStrikerId = room.currentNonStrikerId || null;
    const bowlerId = room.currentBowlerId || null;

    const playerMap = new Map(room.players.map((p) => [p.id, p]));
    const batterName = batterId ? playerMap.get(batterId)?.name : null;
    const bowlerName = bowlerId ? playerMap.get(bowlerId)?.name : null;
    const fielderName = fielderId ? playerMap.get(fielderId)?.name : null;

    // Generate server commentary
    const teamName = targetTeam === 'teamA' ? room.teamAName : room.teamBName;
    const commentary = generateCricketCommentary({
      sport: 'cricket',
      teamName,
      batterName,
      bowlerName,
      fielderName,
      runsOffBat,
      extraType,
      extraRuns,
      isWicket,
      wicketType,
    });

    const lastEvent = {
      id: ballId,
      kind: commentary.kind,
      team: targetTeam,
      playerName: batterName,
      text: commentary.text,
      wicketType: isWicket ? wicketType : null,
    };

    // Save Ball and recompute in transaction
    const { room: updatedRoom } = await prisma.$transaction(async (tx) => {
      await tx.ball.create({
        data: {
          id: ballId,
          roomId: room.id,
          team: targetTeam,
          innings: room.innings,
          overNumber,
          ballInOver,
          isLegal,
          batterId,
          nonStrikerId,
          bowlerId,
          runsOffBat,
          extraType,
          extraRuns,
          isWicket,
          wicketType,
          dismissedPlayerId: dismissedPlayerId || (isWicket ? batterId : null),
          fielderId,
          seq: finalSeq,
          commentary: commentary.text,
        },
      });

      // Legacy room_events row for backward compatibility
      await tx.roomEvent.create({
        data: {
          roomId: room.id,
          team: targetTeam,
          eventType: isWicket ? 'cricket_wicket' : extraType !== 'none' ? extraType : runsOffBat === 0 ? 'dot' : 'cricket_run',
          value: runsOffBat + extraRuns,
          label: commentary.text,
          isHighlight: commentary.kind === 'six' ? 'six' : commentary.kind === 'four' ? 'four' : isWicket ? 'wicket' : null,
          ball: `${overNumber}.${ballInOver}`,
        },
      });

      // Update lastEventJson on room
      await tx.room.update({
        where: { id: room.id },
        data: { lastEventJson: lastEvent as any },
      });

      // Recompute Source of Truth
      return await recomputeMatch(room.id, tx, {
        strikerId: newBatterId ? newBatterId : undefined,
      });
    });

    const serialized = serializeRoom(updatedRoom, undefined, lastEvent);
    emitScoreUpdated(cleanCode, {
      ...serialized,
      revision: updatedRoom.revision,
      lastEvent,
    });

    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error submitting score:', err);
    res.status(500).json({ success: false, error: err.message || 'Scoring failed' });
  }
});

/**
 * POST /rooms/:code/goal — Football goal scoring
 */
router.post('/:code/goal', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const {
      deviceId,
      team,
      id: clientId,
      seq,
      scorerId,
      assistId,
      goalType = 'goal',
      minute,
      period = 'regular',
    } = req.body;

    const targetTeam = normalizeTeam(team);

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase === 'finished') {
      res.status(400).json({ success: false, code: 'MATCH_FINISHED', error: 'Match is finished' });
      return;
    }

    // Permission: must be scorer of credited team OR opponent scorer scoring an own goal
    const isTeamAScorer = room.teamAClaimToken === deviceId;
    const isTeamBScorer = room.teamBClaimToken === deviceId;

    if (!isTeamAScorer && !isTeamBScorer) {
      res.status(403).json({ success: false, code: 'NOT_YOUR_TEAM', error: 'Scorer permission denied' });
      return;
    }

    const goalId = clientId || crypto.randomUUID();

    // Idempotency check
    const existingGoal = await prisma.goalEvent.findUnique({ where: { id: goalId } });
    if (existingGoal) {
      res.json({ success: true, idempotent: true, room: serializeRoom(room) });
      return;
    }

    const lastGoal = room.goalEvents[room.goalEvents.length - 1];
    const expectedSeq = (lastGoal?.seq ?? 0) + 1;
    const finalSeq = seq != null ? Number(seq) : expectedSeq;

    if (seq != null && finalSeq > expectedSeq) {
      res.status(400).json({
        success: false,
        code: 'GAP_IN_SEQUENCE',
        error: `Gap in sequence. Expected seq ${expectedSeq}`,
        expectedSeq,
      });
      return;
    }

    // Server-clock minute calculation
    let calculatedMinute = minute != null ? Number(minute) : 0;
    if (room.clockRunning && room.clockLastStartedAt) {
      const elapsedMs = room.clockAccumulatedMs + (Date.now() - room.clockLastStartedAt.getTime());
      calculatedMinute = Math.max(1, Math.floor(elapsedMs / (60 * 1000)));
    }

    const playerMap = new Map(room.players.map((p) => [p.id, p]));
    const scorerName = scorerId ? playerMap.get(scorerId)?.name : null;
    const assistName = assistId ? playerMap.get(assistId)?.name : null;
    const teamName = targetTeam === 'teamA' ? room.teamAName : room.teamBName;

    const commentary = generateFootballCommentary({
      sport: 'football',
      teamName,
      scorerName,
      assistName,
      goalType,
      minute: calculatedMinute,
    });

    const lastEvent = {
      id: goalId,
      kind: commentary.kind,
      team: targetTeam,
      playerName: scorerName,
      text: commentary.text,
      wicketType: null,
    };

    const { room: updatedRoom } = await prisma.$transaction(async (tx) => {
      await tx.goalEvent.create({
        data: {
          id: goalId,
          roomId: room.id,
          team: targetTeam,
          scorerId: scorerId || null,
          assistId: assistId || null,
          goalType,
          minute: calculatedMinute,
          half: room.currentHalf,
          period,
          seq: finalSeq,
          commentary: commentary.text,
        },
      });

      await tx.roomEvent.create({
        data: {
          roomId: room.id,
          team: targetTeam,
          eventType: 'football_goal',
          value: 1,
          label: commentary.text,
          isHighlight: 'goal',
          minute: calculatedMinute,
        },
      });

      await tx.room.update({
        where: { id: room.id },
        data: { lastEventJson: lastEvent as any },
      });

      return await recomputeMatch(room.id, tx);
    });

    const serialized = serializeRoom(updatedRoom, undefined, lastEvent);
    emitScoreUpdated(cleanCode, {
      ...serialized,
      revision: updatedRoom.revision,
      lastEvent,
    });

    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error recording goal:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record goal' });
  }
});

/**
 * POST /rooms/:code/start-innings — cricket: starts 2nd innings after innings_break
 */
router.post('/:code/start-innings', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId } = req.body;

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase !== 'innings_break') {
      res.status(400).json({ success: false, code: 'WRONG_PHASE', error: 'Room is not at innings break' });
      return;
    }

    const isEditor = room.teamAClaimToken === deviceId || room.teamBClaimToken === deviceId;
    if (!isEditor) {
      res.status(403).json({ success: false, code: 'NOT_YOUR_TEAM', error: 'Only a team scorer can start the 2nd innings.' });
      return;
    }

    const nextBatting: 'teamA' | 'teamB' = room.battingTeam === 'teamA' ? 'teamB' : 'teamA';
    const nextBattingName = nextBatting === 'teamA' ? room.teamAName : room.teamBName;

    await prisma.roomEvent.create({
      data: {
        roomId: room.id,
        team: nextBatting,
        eventType: 'half_start',
        value: 0,
        label: `🏏 2nd Innings started: ${nextBattingName} need ${room.target} runs to win`,
      },
    });

    const updated = await prisma.room.update({
      where: { code: cleanCode },
      data: {
        innings: 2,
        legalBallsInInnings: 0,
        battingTeam: nextBatting,
        currentBatterId: null,
        currentNonStrikerId: null,
        currentBowlerId: null,
        phase: 'in_progress',
        revision: { increment: 1 },
      },
      include: roomInclude,
    });

    const serialized = serializeRoom(updated);
    emitPhaseChanged(cleanCode, serialized);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error starting 2nd innings:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to start 2nd innings' });
  }
});

/**
 * POST /rooms/:code/declare — cricket host: ends innings early (declaration)
 */
router.post('/:code/declare', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId } = req.body;

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase !== 'in_progress') {
      res.status(400).json({ success: false, code: 'WRONG_PHASE', error: 'Cannot declare in this phase' });
      return;
    }

    const isHost = room.hostDeviceId === deviceId || room.teamAClaimToken === deviceId || room.teamBClaimToken === deviceId;
    if (!isHost) {
      res.status(403).json({ success: false, code: 'NOT_HOST', error: 'Only the host or scorers can end innings early' });
      return;
    }

    const currentBatting = room.battingTeam || 'teamA';
    const battingName = currentBatting === 'teamA' ? room.teamAName : room.teamBName;
    const currentScore = currentBatting === 'teamA' ? room.scoreA : room.scoreB;
    const currentWickets = currentBatting === 'teamA' ? room.wicketsA : room.wicketsB;

    let nextPhase: RoomPhase = room.phase;
    let target = room.target;
    let firstInningsRuns = room.firstInningsRuns;
    let firstInningsWickets = room.firstInningsWickets;
    let resultWinner: string | null = room.resultWinner;
    let resultText: string | null = room.resultText;
    let endedReason: string | null = room.endedReason;
    let finishedAt: Date | null = room.finishedAt;

    if (room.innings === 1) {
      nextPhase = 'innings_break';
      firstInningsRuns = currentScore;
      firstInningsWickets = currentWickets;
      target = currentScore + 1;
      endedReason = 'overs_complete';

      await prisma.roomEvent.create({
        data: {
          roomId: room.id,
          team: currentBatting,
          eventType: 'half_end',
          value: 0,
          label: `🛑 ${battingName} declared innings at ${currentScore}/${currentWickets}. Target: ${target}`,
        },
      });
    } else {
      nextPhase = 'finished';
      finishedAt = new Date();
      endedReason = 'overs_complete';
      const targetRuns = target || (firstInningsRuns ? firstInningsRuns + 1 : 1);
      const bowlingTeam = currentBatting === 'teamA' ? 'teamB' : 'teamA';
      const bowlingName = bowlingTeam === 'teamA' ? room.teamAName : room.teamBName;

      if (currentScore >= targetRuns) {
        resultWinner = currentBatting;
        resultText = `${battingName} won the match!`;
      } else {
        resultWinner = bowlingTeam;
        resultText = `${bowlingName} won by ${targetRuns - 1 - currentScore} runs`;
      }
    }

    const updated = await prisma.room.update({
      where: { code: cleanCode },
      data: {
        phase: nextPhase,
        target,
        firstInningsRuns,
        firstInningsWickets,
        resultWinner,
        resultText,
        endedReason,
        finishedAt,
        revision: { increment: 1 },
      },
      include: roomInclude,
    });

    const serialized = serializeRoom(updated);
    emitPhaseChanged(cleanCode, serialized);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error declaring innings:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to declare' });
  }
});

/**
 * POST /rooms/:code/clock — football: { action: 'start' | 'pause' | 'resume' | 'end_half' | 'start_second_half', deviceId }
 */
router.post('/:code/clock', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { action, deviceId } = req.body;

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase === 'finished') {
      res.status(400).json({ success: false, code: 'MATCH_FINISHED', error: 'Match is finished' });
      return;
    }

    const isEditor = room.teamAClaimToken === deviceId || room.teamBClaimToken === deviceId;
    if (!isEditor) {
      res.status(403).json({ success: false, code: 'NOT_YOUR_TEAM', error: 'Only scorers can manage the clock' });
      return;
    }

    const halfDurationMs = (room.phase === 'extra_time' ? 5 : room.halfMinutes) * 60 * 1000;
    const now = Date.now();

    if (action === 'start' || action === 'resume') {
      const updated = await prisma.room.update({
        where: { code: cleanCode },
        data: {
          clockRunning: true,
          clockLastStartedAt: new Date(now),
          revision: { increment: 1 },
        },
        include: roomInclude,
      });

      const remainingMs = Math.max(0, halfDurationMs - updated.clockAccumulatedMs);
      scheduleFootballTimer(cleanCode, remainingMs);

      const serialized = serializeRoom(updated);
      emitScoreUpdated(cleanCode, serialized);
      res.json({ success: true, room: serialized });
      return;
    }

    if (action === 'pause') {
      clearRoomTimer(cleanCode);
      const elapsedSinceStart = room.clockLastStartedAt
        ? now - room.clockLastStartedAt.getTime()
        : 0;
      const newAccumulated = room.clockAccumulatedMs + elapsedSinceStart;

      const updated = await prisma.room.update({
        where: { code: cleanCode },
        data: {
          clockRunning: false,
          clockAccumulatedMs: newAccumulated,
          clockLastStartedAt: null,
          revision: { increment: 1 },
        },
        include: roomInclude,
      });

      const serialized = serializeRoom(updated);
      emitScoreUpdated(cleanCode, serialized);
      res.json({ success: true, room: serialized });
      return;
    }

    if (action === 'end_half') {
      clearRoomTimer(cleanCode);
      await handleFootballTimeUp(cleanCode);
      const updated = await prisma.room.findUnique({
        where: { code: cleanCode },
        include: roomInclude,
      });
      res.json({ success: true, room: serializeRoom(updated!) });
      return;
    }

    if (action === 'start_second_half') {
      clearRoomTimer(cleanCode);
      const updated = await prisma.room.update({
        where: { code: cleanCode },
        data: {
          currentHalf: 2,
          phase: 'in_progress',
          clockRunning: true,
          clockAccumulatedMs: 0,
          clockLastStartedAt: new Date(now),
          revision: { increment: 1 },
        },
        include: roomInclude,
      });

      await prisma.roomEvent.create({
        data: {
          roomId: room.id,
          team: 'teamA',
          eventType: 'half_start',
          value: 0,
          label: `⚽ 2nd Half started`,
          minute: room.halfMinutes,
        },
      });

      scheduleFootballTimer(cleanCode, room.halfMinutes * 60 * 1000);
      const serialized = serializeRoom(updated);
      emitPhaseChanged(cleanCode, serialized);
      res.json({ success: true, room: serialized });
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid clock action' });
  } catch (err: any) {
    console.error('Error in clock action:', err);
    res.status(500).json({ success: false, error: err.message || 'Clock action failed' });
  }
});

/**
 * POST /rooms/:code/shootout-goal — football shootout tally
 */
router.post('/:code/shootout-goal', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { team, deviceId } = req.body;
    const targetTeam = normalizeTeam(team);

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase !== 'shootout') {
      res.status(400).json({ success: false, code: 'WRONG_PHASE', error: 'Room is not in shootout phase' });
      return;
    }

    const isEditor = room.teamAClaimToken === deviceId || room.teamBClaimToken === deviceId;
    if (!isEditor) {
      res.status(403).json({ success: false, code: 'NOT_YOUR_TEAM', error: 'Only scorers can add shootout goals' });
      return;
    }

    const teamName = targetTeam === 'teamA' ? room.teamAName : room.teamBName;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.goalEvent.create({
        data: {
          id: crypto.randomUUID(),
          roomId: room.id,
          team: targetTeam,
          period: 'shootout',
          goalType: 'goal',
          minute: 0,
          half: room.currentHalf,
          seq: (room.goalEvents.length || 0) + 1,
          commentary: `Shootout goal scored by ${teamName}`,
        },
      });

      await tx.roomEvent.create({
        data: {
          roomId: room.id,
          team: targetTeam,
          eventType: 'football_goal',
          value: 1,
          label: `🎯 Shootout Goal! — ${teamName}`,
        },
      });

      const { room: recRoom } = await recomputeMatch(room.id, tx);
      return recRoom;
    });

    const serialized = serializeRoom(updated);
    emitScoreUpdated(cleanCode, serialized);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error adding shootout goal:', err);
    res.status(500).json({ success: false, error: err.message || 'Shootout goal failed' });
  }
});

/**
 * POST /rooms/:code/end-shootout — finalize shootout
 */
router.post('/:code/end-shootout', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId } = req.body;

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room || room.phase !== 'shootout') {
      res.status(400).json({ success: false, error: 'Room not in shootout' });
      return;
    }

    const isEditor = room.teamAClaimToken === deviceId || room.teamBClaimToken === deviceId || room.hostDeviceId === deviceId;
    if (!isEditor) {
      res.status(403).json({ success: false, code: 'NOT_YOUR_TEAM', error: 'Permission denied' });
      return;
    }

    const diff = room.shootoutScoreA - room.shootoutScoreB;
    const winner = diff > 0 ? 'teamA' : diff < 0 ? 'teamB' : 'draw';
    const winnerName = winner === 'teamA' ? room.teamAName : winner === 'teamB' ? room.teamBName : 'Neither';
    const resultText =
      diff === 0
        ? `Tied ${room.shootoutScoreA}–${room.shootoutScoreB} on penalties`
        : `${winnerName} won ${Math.max(room.shootoutScoreA, room.shootoutScoreB)}–${Math.min(room.shootoutScoreA, room.shootoutScoreB)} on penalties`;

    const updated = await prisma.room.update({
      where: { code: cleanCode },
      data: {
        phase: 'finished',
        resultWinner: winner,
        resultText,
        endedReason: 'time_up',
        finishedAt: new Date(),
        revision: { increment: 1 },
      },
      include: roomInclude,
    });

    const serialized = serializeRoom(updated);
    emitPhaseChanged(cleanCode, serialized);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /rooms/:code/end — host early match end
 */
router.post('/:code/end', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { deviceId, reason } = req.body;

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, code: 'ROOM_NOT_FOUND', error: 'Room not found' });
      return;
    }

    if (room.phase === 'finished') {
      res.status(400).json({ success: false, code: 'MATCH_FINISHED', error: 'Match already finished' });
      return;
    }

    const isHost = !room.hostDeviceId || room.hostDeviceId === deviceId || room.teamAClaimToken === deviceId || room.teamBClaimToken === deviceId;
    if (!isHost) {
      res.status(403).json({ success: false, code: 'NOT_HOST', error: 'Only the host can end the match early' });
      return;
    }

    clearRoomTimer(cleanCode);

    const isCricket = room.sport === 'cricket';
    let winner: string | null = null;
    const reasonPrefix = reason ? `Match ended early (${reason})` : 'Match ended early';
    let resultText = reasonPrefix;

    if (isCricket) {
      if (room.scoreA > room.scoreB) {
        winner = 'teamA';
      } else if (room.scoreB > room.scoreA) {
        winner = 'teamB';
      } else {
        winner = 'tie';
      }
      resultText = `${reasonPrefix} — ${room.teamAName} ${room.scoreA}/${room.wicketsA} vs ${room.teamBName} ${room.scoreB}/${room.wicketsB}`;
    } else {
      if (room.scoreA > room.scoreB) {
        winner = 'teamA';
      } else if (room.scoreB > room.scoreA) {
        winner = 'teamB';
      } else {
        winner = 'draw';
      }
      resultText = `${reasonPrefix} — ${room.teamAName} ${room.scoreA} – ${room.scoreB} ${room.teamBName}`;
    }

    const updated = await prisma.room.update({
      where: { code: cleanCode },
      data: {
        phase: 'finished',
        clockRunning: false,
        clockLastStartedAt: null,
        resultWinner: winner,
        resultText,
        endedReason: 'host_ended',
        finishedAt: new Date(),
        revision: { increment: 1 },
      },
      include: roomInclude,
    });

    await prisma.roomEvent.create({
      data: {
        roomId: room.id,
        team: 'teamA',
        eventType: 'match_end',
        value: 0,
        label: `🛑 ${resultText}`,
      },
    });

    const serialized = serializeRoom(updated);
    emitPhaseChanged(cleanCode, serialized);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error ending match early:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to end match' });
  }
});

/**
 * POST /rooms/:code/release-claim — Scorer handover: frees own team claim
 */
router.post('/:code/release-claim', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { team, deviceId } = req.body;
    const targetTeam = normalizeTeam(team);

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const tokenField = targetTeam === 'teamA' ? 'teamAClaimToken' : 'teamBClaimToken';
    if (room[tokenField] === deviceId) {
      const updated = await prisma.room.update({
        where: { code: cleanCode },
        data: { [tokenField]: null, revision: { increment: 1 } },
        include: roomInclude,
      });

      const serialized = serializeRoom(updated);
      emitClaimUpdated(cleanCode, serialized);
      res.json({ success: true, room: serialized });
      return;
    }

    const serialized = serializeRoom(room);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /rooms/:code/reset-scorer — Host-only: reset scorer per team
 * Clears that team's claim token. Old device becomes read-only.
 */
router.post('/:code/reset-scorer', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { hostDeviceId, targetTeam } = req.body;

    if (!targetTeam) {
      res.status(400).json({ success: false, error: 'targetTeam required' });
      return;
    }

    const team = normalizeTeam(targetTeam);

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    if (room.hostDeviceId && room.hostDeviceId !== hostDeviceId) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN_NOT_HOST',
        error: 'Only the host can reset a team scorer.',
      });
      return;
    }

    const tokenField = team === 'teamA' ? 'teamAClaimToken' : 'teamBClaimToken';
    const updated = await prisma.room.update({
      where: { code: cleanCode },
      data: { [tokenField]: null, revision: { increment: 1 } },
      include: roomInclude,
    });

    const serialized = serializeRoom(updated);
    emitClaimUpdated(cleanCode, serialized);
    res.json({ success: true, room: serialized });
  } catch (err: any) {
    console.error('Error resetting scorer:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to reset scorer' });
  }
});

/**
 * POST /rooms/:code/undo — Persistent undo with full source-of-truth recomputation
 * Soft-deletes scorer's team's most recent event, recalculates all totals, strike, crease, and phase.
 */
router.post('/:code/undo', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = String(req.params.code).trim().toUpperCase();
    const { team, deviceId } = req.body;
    const targetTeam = normalizeTeam(team);

    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    if (room.phase === 'finished') {
      res.status(400).json({
        success: false,
        code: 'MATCH_FINISHED',
        error: 'Match is finished. Undo is blocked.',
      });
      return;
    }

    const tokenField = targetTeam === 'teamA' ? 'teamAClaimToken' : 'teamBClaimToken';
    if (room[tokenField] !== deviceId) {
      res.status(403).json({
        success: false,
        code: 'NOT_YOUR_TEAM',
        error: 'Only the claimed scorer of this team can undo its events.',
      });
      return;
    }

    const isCricket = room.sport === 'cricket';

    if (isCricket) {
      // Find latest non-deleted ball for this batting team
      const lastBall = await prisma.ball.findFirst({
        where: {
          roomId: room.id,
          team: targetTeam,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { seq: 'desc' }],
      });

      if (!lastBall) {
        res.status(400).json({ success: false, code: 'NOTHING_TO_UNDO', error: 'No active ball to undo' });
        return;
      }

      // Soft delete ball
      const { room: updatedRoom } = await prisma.$transaction(async (tx) => {
        await tx.ball.update({
          where: { id: lastBall.id },
          data: { deletedAt: new Date() },
        });

        // Recompute Source of Truth
        return await recomputeMatch(room.id, tx);
      });

      const serialized = serializeRoom(updatedRoom);
      // Emit event_undone with full room state and NO animation kind!
      emitEventUndone(cleanCode, serialized);
      res.json({
        success: true,
        undoneEvent: {
          id: lastBall.id,
          summary: lastBall.isWicket
            ? `Wicket (${lastBall.wicketType || 'out'})`
            : lastBall.extraType !== 'none'
            ? `${lastBall.extraType.toUpperCase()} (+${lastBall.extraRuns})`
            : `${lastBall.runsOffBat} run${lastBall.runsOffBat === 1 ? '' : 's'}`,
        },
        room: serialized,
      });
      return;
    } else {
      // Football: find latest non-deleted goal for this team
      const lastGoal = await prisma.goalEvent.findFirst({
        where: {
          roomId: room.id,
          team: targetTeam,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }, { seq: 'desc' }],
      });

      if (!lastGoal) {
        res.status(400).json({ success: false, code: 'NOTHING_TO_UNDO', error: 'No active goal to undo' });
        return;
      }

      const { room: updatedRoom } = await prisma.$transaction(async (tx) => {
        await tx.goalEvent.update({
          where: { id: lastGoal.id },
          data: { deletedAt: new Date() },
        });

        return await recomputeMatch(room.id, tx);
      });

      const serialized = serializeRoom(updatedRoom);
      emitEventUndone(cleanCode, serialized);
      res.json({
        success: true,
        undoneEvent: {
          id: lastGoal.id,
          summary: `Goal (${lastGoal.goalType})`,
        },
        room: serialized,
      });
      return;
    }
  } catch (err: any) {
    console.error('Error in undo:', err);
    res.status(500).json({ success: false, error: err.message || 'Undo failed' });
  }
});

export default router;
