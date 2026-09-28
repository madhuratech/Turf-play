import { prisma } from './prisma.js';
import { RoomPhase } from '@prisma/client';
import { serializeRoom } from './roomSerializer.js';
import { emitPhaseChanged } from '../sockets/index.js';
import { roomInclude } from '../routes/rooms.js';

// Football clock manager and automatic period/time-up handler

const activeTimers = new Map<string, NodeJS.Timeout>();

export function clearRoomTimer(roomCode: string): void {
  const code = roomCode.trim().toUpperCase();
  const existing = activeTimers.get(code);
  if (existing) {
    clearTimeout(existing);
    activeTimers.delete(code);
  }
}

export async function handleFootballTimeUp(roomCode: string): Promise<void> {
  const cleanCode = roomCode.trim().toUpperCase();
  clearRoomTimer(cleanCode);

  try {
    const room = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: roomInclude,
    });

    if (!room || room.phase === RoomPhase.finished) return;

    const totalHalves = room.halves || 2;
    const isFirstHalf = room.currentHalf < totalHalves && room.phase === 'in_progress';
    const isExtraTime = room.phase === 'extra_time';

    if (isFirstHalf) {
      // Transition to Half-Time
      const updated = await prisma.room.update({
        where: { code: cleanCode },
        data: {
          phase: 'half_time',
          clockRunning: false,
          clockLastStartedAt: null,
          clockAccumulatedMs: room.halfMinutes * 60 * 1000,
          revision: { increment: 1 },
        } as any,
        include: roomInclude,
      });

      await prisma.roomEvent.create({
        data: {
          roomId: room.id,
          team: 'teamA',
          eventType: 'half_end',
          value: 0,
          label: `⏸️ Half-Time: ${room.teamAName} ${room.scoreA} – ${room.scoreB} ${room.teamBName}`,
          minute: room.halfMinutes,
        },
      });

      const serialized = serializeRoom(updated);
      emitPhaseChanged(cleanCode, serialized);
    } else {
      // Full time (or Extra Time finished)
      const diff = room.scoreA - room.scoreB;

      if (diff !== 0) {
        // Clear winner
        const winner = diff > 0 ? 'teamA' : 'teamB';
        const winnerName = winner === 'teamA' ? room.teamAName : room.teamBName;
        const resultText = `${winnerName} won ${room.scoreA}–${room.scoreB}`;

        const updated = await prisma.room.update({
          where: { code: cleanCode },
          data: {
            phase: 'finished',
            clockRunning: false,
            clockLastStartedAt: null,
            resultWinner: winner,
            resultText,
            endedReason: 'time_up',
            finishedAt: new Date(),
            revision: { increment: 1 },
          } as any,
          include: roomInclude,
        });

        await prisma.roomEvent.create({
          data: {
            roomId: room.id,
            team: winner,
            eventType: 'match_end',
            value: 0,
            label: `🏁 Full Time: ${resultText}`,
            minute: isExtraTime ? (room.halfMinutes * totalHalves + 5) : (room.halfMinutes * totalHalves),
          },
        });

        const serialized = serializeRoom(updated);
        emitPhaseChanged(cleanCode, serialized);
      } else {
        // Level score at full time
        if (isExtraTime) {
          // Extra time ended without a golden goal -> Draw
          const resultText = `Draw ${room.scoreA}–${room.scoreB} (AET)`;
          const updated = await prisma.room.update({
            where: { code: cleanCode },
            data: {
              phase: 'finished',
              clockRunning: false,
              clockLastStartedAt: null,
              resultWinner: 'draw',
              resultText,
              endedReason: 'time_up',
              finishedAt: new Date(),
              revision: { increment: 1 },
            } as any,
            include: roomInclude,
          });

          const serialized = serializeRoom(updated);
          emitPhaseChanged(cleanCode, serialized);
        } else {
          // Check draw rule
          if (room.drawRule === 'golden_goal') {
            // 5 minute extra time
            const updated = await prisma.room.update({
              where: { code: cleanCode },
              data: {
                phase: 'extra_time',
                clockRunning: true,
                clockAccumulatedMs: 0,
                clockLastStartedAt: new Date(),
                revision: { increment: 1 },
              } as any,
              include: roomInclude,
            });

            await prisma.roomEvent.create({
              data: {
                roomId: room.id,
                team: 'teamA',
                eventType: 'half_start',
                value: 0,
                label: `⏱️ Extra Time started (Golden Goal rule · 5 mins)`,
                minute: room.halfMinutes * totalHalves,
              },
            });

            scheduleFootballTimer(cleanCode, 5 * 60 * 1000);
            const serialized = serializeRoom(updated);
            emitPhaseChanged(cleanCode, serialized);
          } else if (room.drawRule === 'shootout') {
            // Penalty shootout tally phase
            const updated = await prisma.room.update({
              where: { code: cleanCode },
              data: {
                phase: 'shootout',
                clockRunning: false,
                clockLastStartedAt: null,
                revision: { increment: 1 },
              } as any,
              include: roomInclude,
            });

            await prisma.roomEvent.create({
              data: {
                roomId: room.id,
                team: 'teamA',
                eventType: 'extra',
                value: 0,
                label: `🎯 Penalty Shootout started`,
                minute: room.halfMinutes * totalHalves,
              },
            });

            const serialized = serializeRoom(updated);
            emitPhaseChanged(cleanCode, serialized);
          } else {
            // Simple Draw
            const resultText = `Draw ${room.scoreA}–${room.scoreB}`;
            const updated = await prisma.room.update({
              where: { code: cleanCode },
              data: {
                phase: 'finished',
                clockRunning: false,
                clockLastStartedAt: null,
                resultWinner: 'draw',
                resultText,
                endedReason: 'time_up',
                finishedAt: new Date(),
                revision: { increment: 1 },
              } as any,
              include: roomInclude,
            });

            await prisma.roomEvent.create({
              data: {
                roomId: room.id,
                team: 'teamA',
                eventType: 'match_end',
                value: 0,
                label: `🏁 Full Time: ${resultText}`,
                minute: room.halfMinutes * totalHalves,
              },
            });

            const serialized = serializeRoom(updated);
            emitPhaseChanged(cleanCode, serialized);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error handling time up for room ${cleanCode}:`, err);
  }
}

export function scheduleFootballTimer(roomCode: string, remainingMs: number): void {
  const cleanCode = roomCode.trim().toUpperCase();
  clearRoomTimer(cleanCode);

  if (remainingMs <= 0) {
    handleFootballTimeUp(cleanCode);
    return;
  }

  const timer = setTimeout(() => {
    handleFootballTimeUp(cleanCode);
  }, remainingMs);

  activeTimers.set(cleanCode, timer);
}
