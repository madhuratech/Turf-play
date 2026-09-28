import React, { useState } from 'react';
import type { MatchRoom } from '../types';
import { startSecondInnings } from '../lib/roomService';
import { Play } from 'lucide-react';

interface InningsBreakScreenProps {
  room: MatchRoom;
  deviceId: string;
}

export const InningsBreakScreen: React.FC<InningsBreakScreenProps> = ({ room, deviceId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isScorer = room.claims.teamA === deviceId || room.claims.teamB === deviceId;

  // 1st innings batting team
  const firstBattingTeamKey = room.battingTeam === 'teamA' ? 'teamA' : 'teamB';
  const firstBattingName = firstBattingTeamKey === 'teamA' ? room.teamA.name : room.teamB.name;
  const firstInningsScore = room.cricketState?.firstInningsRuns ?? (firstBattingTeamKey === 'teamA' ? room.teamA.cricketScore?.runs : room.teamB.cricketScore?.runs) ?? 0;
  const firstInningsWickets = room.cricketState?.firstInningsWickets ?? (firstBattingTeamKey === 'teamA' ? room.teamA.cricketScore?.wickets : room.teamB.cricketScore?.wickets) ?? 0;

  // 2nd innings chasing team
  const chasingTeamKey = firstBattingTeamKey === 'teamA' ? 'teamB' : 'teamA';
  const chasingTeamName = chasingTeamKey === 'teamA' ? room.teamA.name : room.teamB.name;

  const target = room.cricketState?.target ?? (firstInningsScore + 1);
  const totalBalls = room.rules.oversPerInnings * 6;
  const requiredRunRate = Number(((target / totalBalls) * 6).toFixed(2));

  const handleStartSecondInnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await startSecondInnings(room.code, deviceId);
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start 2nd innings');
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
          Innings Break
        </span>

        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>
          1st Innings Complete
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
          {firstBattingName} finished their innings. Prepare for the run chase!
        </p>

        {/* State of Play Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '1.5rem',
            marginBottom: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1st Innings Total
            </div>
            <div
              style={{
                fontFamily: 'var(--font-scoreboard)',
                fontSize: '2.5rem',
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '0.04em',
                marginTop: '0.2rem',
              }}
            >
              {firstBattingName}: <span style={{ color: 'var(--accent-floodlight)' }}>{firstInningsScore}/{firstInningsWickets}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ({room.rules.oversPerInnings} overs match)
            </div>
          </div>

          <div
            style={{
              paddingTop: '1rem',
              borderTop: '1px dashed var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Chase Equation
            </div>
            <div
              style={{
                fontFamily: 'var(--font-scoreboard)',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              {chasingTeamName} need <span style={{ color: 'var(--accent-floodlight)' }}>{target} runs</span> from {totalBalls} balls
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Required Run Rate: <strong style={{ color: 'var(--accent-floodlight)' }}>{requiredRunRate}</strong> RPO
            </div>
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

        {/* Clear Action Button */}
        {isScorer ? (
          <button
            onClick={handleStartSecondInnings}
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', gap: '0.5rem', padding: '1rem 1.5rem', fontSize: '1.1rem' }}
          >
            <Play size={20} fill="currentColor" />
            {loading ? 'Starting 2nd Innings...' : 'Start 2nd Innings'}
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
            Waiting for team scorer to start the 2nd innings...
          </div>
        )}
      </div>
    </div>
  );
};
