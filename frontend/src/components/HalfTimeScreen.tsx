import React, { useState } from 'react';
import type { MatchRoom } from '../types';
import { updateFootballClock } from '../lib/roomService';
import { Play } from 'lucide-react';

interface HalfTimeScreenProps {
  room: MatchRoom;
  deviceId: string;
}

export const HalfTimeScreen: React.FC<HalfTimeScreenProps> = ({ room, deviceId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isScorer = room.claims.teamA === deviceId || room.claims.teamB === deviceId;

  const handleStartSecondHalf = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateFootballClock(room.code, 'start_second_half', deviceId);
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start 2nd half');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', textAlign: 'center', padding: '1rem 0' }}>
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1.5px solid var(--accent-floodlight)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-scoreboard)',
        }}
      >
        <span className="badge badge-amber" style={{ marginBottom: '1rem' }}>
          Half-Time
        </span>

        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>
          First Half Concluded
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
          Teams are taking their break. Ready to resume with the second half?
        </p>

        {/* State of Play Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '1.75rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Match Score
          </div>
          <div
            style={{
              fontFamily: 'var(--font-scoreboard)',
              fontSize: '2.6rem',
              fontWeight: 900,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
              margin: '0.5rem 0',
            }}
          >
            <span>{room.teamA.name}</span>{' '}
            <span style={{ color: 'var(--accent-floodlight)', margin: '0 0.5rem' }}>
              {room.teamA.footballScore?.goals ?? 0} – {room.teamB.footballScore?.goals ?? 0}
            </span>{' '}
            <span>{room.teamB.name}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Half 1 completed ({room.rules.halfMinutes} min) &bull; Next: Half 2
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(232, 93, 74, 0.15)',
              border: '1px solid var(--status-live)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-live)',
              fontSize: '0.9rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        {isScorer ? (
          <button
            onClick={handleStartSecondHalf}
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', gap: '0.5rem', padding: '1rem 1.5rem', fontSize: '1.1rem' }}
          >
            <Play size={20} fill="currentColor" />
            {loading ? 'Starting 2nd Half...' : 'Start 2nd Half'}
          </button>
        ) : (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
            }}
          >
            Waiting for team scorer to begin the 2nd half...
          </div>
        )}
      </div>
    </div>
  );
};
