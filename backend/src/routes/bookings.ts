import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * POST /bookings — body: { slotId, deviceId, playerName, phone }
 * Checks isBooked is false, creates Booking, flips isBooked in a transaction.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slotId, deviceId, playerName, phone } = req.body;

    if (!slotId) {
      res.status(400).json({ error: 'slotId is required' });
      return;
    }

    const bookingResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch slot with locking check
      const slot = await tx.turfSlot.findUnique({
        where: { id: slotId },
        include: { turf: true },
      });

      if (!slot) {
        throw new Error('SLOT_NOT_FOUND');
      }

      if (slot.isBooked) {
        throw new Error('ALREADY_BOOKED');
      }

      // 2. Create booking record
      const booking = await tx.booking.create({
        data: {
          slotId: slot.id,
          bookedByDevice: deviceId || 'anonymous_device',
          playerName: playerName || 'Player',
          phone: phone || '',
        },
      });

      // 3. Mark slot as booked
      const updatedSlot = await tx.turfSlot.update({
        where: { id: slotId },
        data: { isBooked: true },
      });

      return {
        booking,
        slot: updatedSlot,
        turf: slot.turf,
      };
    });

    const formattedConfirmation = {
      bookingId: 'KC-BK-' + bookingResult.booking.id.substring(0, 8).toUpperCase(),
      turf: bookingResult.turf,
      slot: {
        id: bookingResult.slot.id,
        startTime: formatTime(bookingResult.slot.startsAt),
        endTime: formatTime(bookingResult.slot.endsAt),
        available: false,
        price: bookingResult.slot.price ?? 1000,
      },
      date: bookingResult.slot.startsAt.toISOString().split('T')[0],
      playerName: bookingResult.booking.playerName || 'Player',
      status: 'confirmed' as const,
      timestamp: bookingResult.booking.createdAt.getTime(),
    };

    res.status(201).json(formattedConfirmation);
  } catch (err: any) {
    if (err.message === 'SLOT_NOT_FOUND') {
      res.status(404).json({ error: 'Time slot not found' });
      return;
    }
    if (err.message === 'ALREADY_BOOKED') {
      res.status(409).json({ error: 'This slot has already been booked by another player.' });
      return;
    }
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message || 'Failed to process booking' });
  }
});

export default router;
