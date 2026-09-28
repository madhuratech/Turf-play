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

function getDayLabel(d: number, targetDate: Date): string {
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * GET /turfs?city=&sport= — query Turf table
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, sport, query } = req.query as {
      city?: string;
      sport?: string;
      query?: string;
    };

    let turfs = await prisma.turf.findMany();

    // In-memory filter for flexible JSON sport array matching and case-insensitive city
    if (city && city.trim() !== '') {
      const lowerCity = city.trim().toLowerCase();
      turfs = turfs.filter((t) => t.city.toLowerCase() === lowerCity);
    }

    if (sport && sport !== 'all') {
      const lowerSport = sport.trim().toLowerCase();
      turfs = turfs.filter((t) => {
        const sportsArray = Array.isArray(t.sports) ? (t.sports as string[]) : [];
        return sportsArray.map((s) => s.toLowerCase()).includes(lowerSport);
      });
    }

    if (query && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      turfs = turfs.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.area && t.area.toLowerCase().includes(q)) ||
          t.city.toLowerCase().includes(q)
      );
    }

    res.json(turfs);
  } catch (err: any) {
    console.error('Error fetching turfs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch turfs' });
  }
});

/**
 * GET /turfs/:id — single turf details
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const turfId = String(req.params.id);
    const turf = await prisma.turf.findUnique({
      where: { id: turfId },
    });

    if (!turf) {
      res.status(404).json({ error: 'Turf not found' });
      return;
    }

    res.json(turf);
  } catch (err: any) {
    console.error('Error fetching turf:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch turf' });
  }
});

/**
 * GET /turfs/:id/slots — query TurfSlot for that turf
 */
router.get('/:id/slots', async (req: Request, res: Response): Promise<void> => {
  try {
    const turfId = String(req.params.id);

    const slots = await prisma.turfSlot.findMany({
      where: { turfId },
      orderBy: { startsAt: 'asc' },
    });

    // Group into DaySlots format expected by frontend
    const dayMap = new Map<string, { date: string; dayLabel: string; slots: any[] }>();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    slots.forEach((s) => {
      const dateStr = s.startsAt.toISOString().split('T')[0];
      if (!dayMap.has(dateStr)) {
        const slotDate = new Date(s.startsAt);
        const dayDiff = Math.floor(
          (new Date(dateStr).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
        );

        dayMap.set(dateStr, {
          date: dateStr,
          dayLabel: getDayLabel(dayDiff, slotDate),
          slots: [],
        });
      }

      dayMap.get(dateStr)!.slots.push({
        id: s.id,
        startTime: formatTime(s.startsAt),
        endTime: formatTime(s.endsAt),
        available: !s.isBooked,
        price: s.price ?? 1000,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      });
    });

    const daySlots = Array.from(dayMap.values());

    res.json({
      slots,
      daySlots,
    });
  } catch (err: any) {
    console.error('Error fetching turf slots:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch turf slots' });
  }
});

export default router;
