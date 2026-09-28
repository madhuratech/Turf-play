import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import { serializeRoom } from '../lib/roomSerializer.js';

let ioInstance: SocketIOServer | null = null;

export function setupSocketIO(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    // Client joins room: room:{code}
    socket.on('join', async (data: { code: string; deviceId?: string }) => {
      if (!data || !data.code) return;
      const cleanCode = data.code.trim().toUpperCase();
      const roomChannel = `room:${cleanCode}`;

      socket.join(roomChannel);

      try {
        const room = await prisma.room.findUnique({
          where: { code: cleanCode },
          include: {
            events: true,
            players: { orderBy: { position: 'asc' } },
            balls: { where: { deletedAt: null }, orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }] },
            goalEvents: { where: { deletedAt: null }, orderBy: [{ createdAt: 'asc' }, { seq: 'asc' }] },
          },
        });

        if (room) {
          const serialized = serializeRoom(room);
          socket.emit('room_state', serialized);
        } else {
          socket.emit('error', { message: `Room ${cleanCode} not found` });
        }
      } catch (err: any) {
        console.error('Socket join error:', err);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });
}

export function emitPhaseChanged(code: string, payload: any) {
  if (!ioInstance) return;
  const cleanCode = code.trim().toUpperCase();
  ioInstance.to(`room:${cleanCode}`).emit('phase_changed', payload);
}

export function emitScoreUpdated(code: string, payload: any) {
  if (!ioInstance) return;
  const cleanCode = code.trim().toUpperCase();
  ioInstance.to(`room:${cleanCode}`).emit('score_updated', payload);
}

export function emitEventUndone(code: string, payload: any) {
  if (!ioInstance) return;
  const cleanCode = code.trim().toUpperCase();
  ioInstance.to(`room:${cleanCode}`).emit('event_undone', payload);
}

export function emitClaimUpdated(code: string, payload: any) {
  if (!ioInstance) return;
  const cleanCode = code.trim().toUpperCase();
  ioInstance.to(`room:${cleanCode}`).emit('claim_updated', payload);
}

