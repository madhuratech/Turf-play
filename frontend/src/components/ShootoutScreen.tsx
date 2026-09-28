import React, { useState } from 'react';
import type { MatchRoom } from '../types';
import { addShootoutGoal, endShootout } from '../lib/roomService';
import { CheckCircle2 } from 'lucide-react';

interface ShootoutScreenProps {
  room: MatchRoom;
  deviceId: string;
}

export const ShootoutScreen: React.FC<ShootoutScreenProps> = ({ room, deviceId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isScorerA = room.claims.teamA === deviceId;
  const isScorerB = room.claims.teamB === deviceId;
  const isAnyScorer = isScorerA || isScorerB;

  const scoreA = room.footballState?.shootoutScoreA ?? 0;
  const scoreB = room.footballState?.shootoutScoreB ?? 0;

  const handleAddGoal = async (team: 'teamA' | 'teamB') => {
    setLoading(true);
    setError(null);
    try {
      const res = await addShootoutGoal(room.code, team, deviceId);
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add shootout goal');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await endShootout(room.code, deviceId);
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to finalize shootout');
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
          Penalty Shootout
        </span>

        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>
          Shootout Tally
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
          Regular time ended level. Scorers add converted penalties below.
        </p>

        {/* Shootout Score Display */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Penalties Converted
          </div>
          <div
            style={{
              fontFamily: 'var(--font-scoreboard)',
              fontSize: '3rem',
              fontWeight: 900,
              color: 'var(--accent-floodlight)',
              letterSpacing: '0.1em',
              margin: '0.5rem 0',
            }}
          >
            {scoreA} – {scoreB}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {room.teamA.name} vs {room.teamB.name}
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

        {/* Goal Add Buttons */}
        {isAnyScorer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleAddGoal('teamA')}
                disabled={loading || !isScorerA}
                className="btn btn-outline"
                style={{
                  padding: '1rem',
                  opacity: isScorerA ? 1 : 0.4,
                  cursor: isScorerA ? 'pointer' : 'not-allowed',
                }}
              >
                + Goal {room.teamA.name}
              </button>

              <button
                type="button"
                onClick={() => handleAddGoal('teamB')}
                disabled={loading || !isScorerB}
                className="btn btn-outline"
                style={{
                  padding: '1rem',
                  opacity: isScorerB ? 1 : 0.4,
                  cursor: isScorerB ? 'pointer' : 'not-allowed',
                }}
              >
                + Goal {room.teamB.name}
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              disabled={loading || scoreA === scoreB}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <CheckCircle2 size={18} />
              {scoreA === scoreB ? 'Scores Tied (Add Winning Goal)' : 'Finish Shootout & End Match'}
            </button>
          </div>
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
            Shootout in progress. Watching live penalty conversions...
          </div>
        )}
      </div>
    </div>
  );
};
