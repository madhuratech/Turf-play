import { io, Socket } from 'socket.io-client';
import type { MatchRoom, TeamKey, CreateRoomInput, TossChoice, LastEvent } from '../types';
import { getDeviceId } from './device';
import { enqueueAction, getNextOutboxSeq } from './outbox';

export type ScoreAction =
  | { type: 'CRICKET_DOT' }
  | { type: 'CRICKET_RUN'; runs: number; isBoundary?: 'four' | 'six'; legalBall?: boolean }
  | { type: 'CRICKET_WICKET'; kind?: string; legalBall?: boolean }
  | { type: 'CRICKET_EXTRA'; extraType: 'wide' | 'noball' | 'bye' | 'legbye'; runs?: number }
  | { type: 'FOOTBALL_GOAL'; scorerName?: string }
  | { type: 'FOOTBALL_CARD'; cardType: 'yellow' | 'red' }
  | { type: 'FOOTBALL_STAT'; stat: 'corner' | 'foul' };

export type ClockAction = 'start' | 'pause' | 'resume' | 'end_half' | 'start_second_half';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';
const SOCKET_BASE = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:4000';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_BASE, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
    });
  }
  return globalSocket;
}

/**
 * Creates a new match room via backend API with rules
 */
export async function createRoom(input: CreateRoomInput): Promise<MatchRoom> {
  const hostDeviceId = input.hostDeviceId || getDeviceId();

  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sport: input.sport,
      teamAName: input.teamAName,
      teamBName: input.teamBName,
      teamAColor: input.teamAColor,
      teamBColor: input.teamBColor,
      hostDeviceId,
      rules: input.rules,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create room (${res.status})`);
  }

  const data = await res.json();
  const room: MatchRoom = data.room || data;
  if (data.qrImageBase64) {
    room.qrImageBase64 = data.qrImageBase64;
  }

  if (input.claimTeam) {
    try {
      await claimTeam(room.code, input.claimTeam, hostDeviceId);
    } catch (err) {
      console.warn('Initial team claim failed:', err);
    }
  }

  return room;
}

/**
 * Fetches an existing room by its 6-character code
 */
export async function getRoom(code: string): Promise<MatchRoom | null> {
  const cleanCode = code.trim().toUpperCase();
  const res = await fetch(`${API_BASE}/rooms/${cleanCode}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch room (${res.status})`);
  }

  const room = await res.json();
  return room;
}

/**
 * Claims a team for a specific device.
 */
export async function claimTeam(
  code: string,
  team: TeamKey,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Team could not be claimed.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Updates a team's player roster
 */
export async function updatePlayers(
  code: string,
  deviceId: string,
  team: TeamKey,
  names: string[]
): Promise<{ success: boolean; error?: string; room?: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/players`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, team, names }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to update squad.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Updates cricket crease state (striker, non-striker, bowler, or strike swap)
 */
export async function updateCrease(
  code: string,
  deviceId: string,
  payload: {
    strikerId?: string | null;
    nonStrikerId?: string | null;
    bowlerId?: string | null;
    swapStrike?: boolean;
  }
): Promise<{ success: boolean; error?: string; room?: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/crease`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to update crease.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Flips the coin for the toss
 */
export async function flipCoinToss(
  code: string,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/toss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Coin toss failed.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

export const triggerCoinToss = flipCoinToss;

export async function advanceTossToChoice(_code: string): Promise<void> {
  // Toss automatically advances via backend timer
}

/**
 * Submits the toss choice
 */
export async function submitTossChoice(
  code: string,
  choice: TossChoice,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/toss-choice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice, deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to submit toss choice.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Submits a cricket ball score event with client UUID and offline outbox queuing
 */
export async function submitBallScore(
  code: string,
  team: TeamKey,
  deviceId: string,
  ballData: {
    runsOffBat: number;
    extraType?: string;
    extraRuns?: number;
    isWicket?: boolean;
    wicketType?: string | null;
    dismissedPlayerId?: string | null;
    fielderId?: string | null;
    newBatterId?: string | null;
  },
  serverRevision: number = 0
): Promise<{ success: boolean; id: string; error?: string; room?: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();
  const id = crypto.randomUUID();
  const seq = getNextOutboxSeq(cleanCode, serverRevision);

  const payload = {
    id,
    seq,
    team,
    deviceId,
    ...ballData,
  };

  // If offline or network error, enqueue to outbox immediately
  if (!navigator.onLine) {
    enqueueAction({
      id,
      roomCode: cleanCode,
      endpoint: '/score',
      payload,
      seq,
      timestamp: Date.now(),
      attempts: 0,
    });
    return { success: true, id };
  }

  try {
    const res = await fetch(`${API_BASE}/rooms/${cleanCode}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      if (res.status >= 500) {
        // Enqueue on server 5xx
        enqueueAction({
          id,
          roomCode: cleanCode,
          endpoint: '/score',
          payload,
          seq,
          timestamp: Date.now(),
          attempts: 1,
        });
        return { success: true, id };
      }
      return {
        success: false,
        id,
        error: data.error || 'Failed to record ball score.',
        room: data.room,
      };
    }

    return {
      success: true,
      id,
      room: data.room,
    };
  } catch (err: any) {
    // Network failure: enqueue to outbox
    enqueueAction({
      id,
      roomCode: cleanCode,
      endpoint: '/score',
      payload,
      seq,
      timestamp: Date.now(),
      attempts: 1,
    });
    return { success: true, id };
  }
}

/**
 * Submits a football goal event with client UUID and offline outbox queuing
 */
export async function submitGoal(
  code: string,
  team: TeamKey,
  deviceId: string,
  goalData: {
    scorerId?: string | null;
    assistId?: string | null;
    goalType?: 'goal' | 'penalty' | 'own_goal';
    minute?: number;
    period?: 'regular' | 'extra_time' | 'shootout';
  },
  serverRevision: number = 0
): Promise<{ success: boolean; id: string; error?: string; room?: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();
  const id = crypto.randomUUID();
  const seq = getNextOutboxSeq(cleanCode, serverRevision);

  const payload = {
    id,
    seq,
    team,
    deviceId,
    ...goalData,
  };

  if (!navigator.onLine) {
    enqueueAction({
      id,
      roomCode: cleanCode,
      endpoint: '/goal',
      payload,
      seq,
      timestamp: Date.now(),
      attempts: 0,
    });
    return { success: true, id };
  }

  try {
    const res = await fetch(`${API_BASE}/rooms/${cleanCode}/goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      if (res.status >= 500) {
        enqueueAction({
          id,
          roomCode: cleanCode,
          endpoint: '/goal',
          payload,
          seq,
          timestamp: Date.now(),
          attempts: 1,
        });
        return { success: true, id };
      }
      return {
        success: false,
        id,
        error: data.error || 'Failed to record goal.',
        room: data.room,
      };
    }

    return {
      success: true,
      id,
      room: data.room,
    };
  } catch (err: any) {
    enqueueAction({
      id,
      roomCode: cleanCode,
      endpoint: '/goal',
      payload,
      seq,
      timestamp: Date.now(),
      attempts: 1,
    });
    return { success: true, id };
  }
}

/**
 * Legacy submitScoreEvent adapter
 */
export async function submitScoreEvent(
  code: string,
  team: TeamKey,
  action: ScoreAction,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, action, deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to submit score.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Cricket: Starts 2nd innings
 */
export async function startSecondInnings(
  code: string,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/start-innings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to start 2nd innings.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Cricket: Host declares innings early
 */
export async function declareInnings(
  code: string,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/declare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to declare innings.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Football: Clock control
 */
export async function updateFootballClock(
  code: string,
  action: ClockAction,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/clock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to update clock.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Football: Shootout goal
 */
export async function addShootoutGoal(
  code: string,
  team: TeamKey,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/shootout-goal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to record shootout goal.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Football: Finalize shootout
 */
export async function endShootout(
  code: string,
  deviceId: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/end-shootout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to end shootout.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Host ends match early
 */
export async function endMatchEarly(
  code: string,
  deviceId: string,
  reason?: string
): Promise<{ success: boolean; error?: string; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, reason }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to end match early.',
      room: data.room,
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Releases claim on a team (Scorer handover)
 */
export async function releaseTeamClaim(
  code: string,
  team: TeamKey,
  deviceId: string
): Promise<{ success: boolean; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/release-claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, deviceId }),
  });

  const data = await res.json().catch(() => ({}));
  return {
    success: true,
    room: data.room,
  };
}

/**
 * Host-only: Resets a team's scorer claim
 */
export async function resetScorer(
  code: string,
  hostDeviceId: string,
  targetTeam: TeamKey
): Promise<{ success: boolean; error?: string; room?: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/reset-scorer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostDeviceId, targetTeam }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to reset scorer.',
    };
  }

  return {
    success: true,
    room: data.room,
  };
}

/**
 * Undo the last score event for the specified team
 */
export async function undoLastScoreEvent(
  code: string,
  team: TeamKey,
  deviceId: string
): Promise<{ success: boolean; error?: string; undoneEvent?: any; room: MatchRoom }> {
  const cleanCode = code.trim().toUpperCase();

  const res = await fetch(`${API_BASE}/rooms/${cleanCode}/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, deviceId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to undo last event.',
      room: data.room,
    };
  }

  return {
    success: true,
    undoneEvent: data.undoneEvent,
    room: data.room,
  };
}

/**
 * Subscribes to real-time room updates via Socket.io
 */
export function subscribeToRoom(
  code: string,
  callback: (room: MatchRoom) => void,
  onReactionEvent?: (event: LastEvent) => void
): () => void {
  const cleanCode = code.trim().toUpperCase();
  const socket = getSocket();
  const deviceId = getDeviceId();

  socket.emit('join', { code: cleanCode, deviceId });

  let lastSeenRevision = -1;

  const handleUpdate = (updatedRoom: MatchRoom) => {
    if (updatedRoom && updatedRoom.code === cleanCode) {
      if (updatedRoom.revision != null && updatedRoom.revision <= lastSeenRevision) {
        return; // Ignore older or duplicate revisions
      }
      if (updatedRoom.revision != null) {
        lastSeenRevision = updatedRoom.revision;
      }
      callback(updatedRoom);
    }
  };

  const handleScoreUpdated = (payload: any) => {
    const updatedRoom: MatchRoom = payload;
    if (updatedRoom && updatedRoom.code === cleanCode) {
      if (updatedRoom.revision != null && updatedRoom.revision <= lastSeenRevision) {
        return;
      }
      if (updatedRoom.revision != null) {
        lastSeenRevision = updatedRoom.revision;
      }
      callback(updatedRoom);

      if (payload.lastEvent && onReactionEvent) {
        onReactionEvent(payload.lastEvent);
      }
    }
  };

  const handleEventUndone = (updatedRoom: MatchRoom) => {
    if (updatedRoom && updatedRoom.code === cleanCode) {
      if (updatedRoom.revision != null) {
        lastSeenRevision = updatedRoom.revision;
      }
      // NO animation callback triggered on undo!
      callback(updatedRoom);
    }
  };

  socket.on('room_state', handleUpdate);
  socket.on('phase_changed', handleUpdate);
  socket.on('score_updated', handleScoreUpdated);
  socket.on('event_undone', handleEventUndone);
  socket.on('claim_updated', handleUpdate);

  return () => {
    socket.off('room_state', handleUpdate);
    socket.off('phase_changed', handleUpdate);
    socket.off('score_updated', handleScoreUpdated);
    socket.off('event_undone', handleEventUndone);
    socket.off('claim_updated', handleUpdate);
  };
}
