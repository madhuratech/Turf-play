import type { Turf, DaySlots, BookingRequestInput, BookingConfirmation, SportType } from '../types';
import { getDeviceId } from './device';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

const COIMBATORE_CENTER = { lat: 11.0168, lng: 76.9558 };

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export interface TurfSearchParams {
  city?: string;
  sport?: SportType | 'all';
  userLat?: number | null;
  userLng?: number | null;
  searchQuery?: string;
}

/**
 * Search turfs via backend API with distance sorting
 */
export async function searchTurfs(params: TurfSearchParams): Promise<Turf[]> {
  const { city = 'Coimbatore', sport = 'all', userLat, userLng, searchQuery = '' } = params;

  try {
    const url = new URL(`${API_BASE}/turfs`);
    if (city) url.searchParams.set('city', city);
    if (sport && sport !== 'all') url.searchParams.set('sport', sport);
    if (searchQuery) url.searchParams.set('query', searchQuery);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Failed to query turfs (${res.status})`);
    }

    let results: Turf[] = await res.json();

    // Calculate distance
    const baseLat = userLat ?? (city === 'Coimbatore' ? COIMBATORE_CENTER.lat : results[0]?.lat);
    const baseLng = userLng ?? (city === 'Coimbatore' ? COIMBATORE_CENTER.lng : results[0]?.lng);

    results = results.map((turf) => {
      const dist =
        baseLat != null && baseLng != null
          ? calculateHaversineDistance(baseLat, baseLng, turf.lat, turf.lng)
          : undefined;
      return { ...turf, distanceKm: dist };
    });

    results.sort((a, b) => {
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      return b.rating - a.rating;
    });

    return results;
  } catch (err) {
    console.warn('Backend turf search failed, using local cache:', err);
    return [];
  }
}

/**
 * Fetch a single turf by ID from backend
 */
export async function getTurfById(id: string): Promise<Turf | null> {
  try {
    const res = await fetch(`${API_BASE}/turfs/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch turf');
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch turf by id:', err);
    return null;
  }
}

/**
 * Query real slots from backend for a turf
 */
export async function fetchTurfSlots(turfId: string): Promise<DaySlots[]> {
  try {
    const res = await fetch(`${API_BASE}/turfs/${turfId}/slots`);
    if (!res.ok) throw new Error('Failed to fetch slots');
    const data = await res.json();
    return data.daySlots || [];
  } catch (err) {
    console.warn('Failed to fetch turf slots from server:', err);
    return [];
  }
}

/**
 * Synchronous slot generator fallback for immediate UI render
 */
export function getAvailableSlots(turfId: string): DaySlots[] {
  const timeSlots = [
    { start: '06:00 AM', end: '07:00 AM', peakMultiplier: 0.8 },
    { start: '07:00 AM', end: '08:00 AM', peakMultiplier: 0.9 },
    { start: '08:00 AM', end: '09:00 AM', peakMultiplier: 1.0 },
    { start: '04:00 PM', end: '05:00 PM', peakMultiplier: 1.0 },
    { start: '05:00 PM', end: '06:00 PM', peakMultiplier: 1.1 },
    { start: '06:00 PM', end: '07:00 PM', peakMultiplier: 1.25 },
    { start: '07:00 PM', end: '08:00 PM', peakMultiplier: 1.3 },
    { start: '08:00 PM', end: '09:00 PM', peakMultiplier: 1.3 },
    { start: '09:00 PM', end: '10:00 PM', peakMultiplier: 1.25 },
    { start: '10:00 PM', end: '11:00 PM', peakMultiplier: 1.1 },
  ];

  const days: DaySlots[] = [];
  const now = new Date();

  for (let d = 0; d < 3; d++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + d);

    const dateStr = targetDate.toISOString().split('T')[0];
    const dayLabel =
      d === 0
        ? 'Today'
        : d === 1
        ? 'Tomorrow'
        : targetDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

    const seed = turfId.charCodeAt(turfId.length - 1) + d * 7;

    const slots = timeSlots.map((ts, index) => {
      const isBooked = (seed + index * 3) % 4 === 0 && index > 4;
      return {
        id: `${turfId}_${dateStr}_slot_${index}`,
        startTime: ts.start,
        endTime: ts.end,
        available: !isBooked,
        price: Math.round(1200 * ts.peakMultiplier),
      };
    });

    days.push({
      date: dateStr,
      dayLabel,
      slots,
    });
  }

  return days;
}

/**
 * Submits a booking request to backend: POST /bookings
 */
export async function bookSlot(input: BookingRequestInput): Promise<BookingConfirmation> {
  const deviceId = getDeviceId();

  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slotId: input.slotId,
      deviceId,
      playerName: input.playerName,
      phone: input.phone,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Booking failed (${res.status})`);
  }

  return data as BookingConfirmation;
}
