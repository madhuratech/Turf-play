import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchRoom } from '../types';
import { createRoom } from '../lib/roomService';
import { getDeviceId } from '../lib/device';
import { Trophy, Share2, RotateCcw, Home, Check } from 'lucide-react';

interface ResultScreenProps {
  room: MatchRoom;
  deviceId?: string;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ room }) => {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);

  const isCricket = room.sport === 'cricket';

  // Winner calculation
  const winnerKey = room.result?.winner;
  const isTieOrDraw = winnerKey === 'draw' || winnerKey === 'tie';
  const winnerName =
    winnerKey === 'teamA'
      ? room.teamA.name
      : winnerKey === 'teamB'
      ? room.teamB.name
      : isTieOrDraw
      ? (isCricket ? 'Match Tied' : 'Draw')
      : 'Match Finished';

  const resultText = room.result?.resultText || 'Match Completed';

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/room/${room.code}`
      : `/room/${room.code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleRematch = async () => {
    setRematchLoading(true);
    setRematchError(null);

    try {
      const newRoom = await createRoom({
        sport: room.sport,
        teamAName: room.teamA.name,
        teamBName: room.teamB.name,
        hostDeviceId: getDeviceId(),
        rules: {
          oversPerInnings: room.rules.oversPerInnings,
          playersPerSide: room.rules.playersPerSide,
          wideNoBallRerun: room.rules.wideNoBallRerun,
          halfMinutes: room.rules.halfMinutes,
          halves: room.rules.halves,
          drawRule: room.rules.drawRule,
          mercyGoalLead: room.rules.mercyGoalLead,
        },
      });

      navigate(`/room/${newRoom.code}`);
    } catch (err: any) {
      setRematchError(err.message || 'Failed to initialize rematch');
      setRematchLoading(false);
    }
  };

  // Football Goals Timeline
  const footballGoalsEvents = room.events.filter(
    (e) => e.eventType === 'football_goal' && !e.undone
  );

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1.5px solid var(--accent-floodlight)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-scoreboard)',
          textAlign: 'center',
        }}
      >
        {/* Match Finished Badge */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="badge badge-amber" style={{ padding: '0.35rem 0.85rem' }}>
            Final Result &bull; Official
          </span>
        </div>

        {/* Winner Reveal Banner (Restrained single scale-in animation, no confetti) */}
        <div className="result-reveal-scale" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(242, 201, 76, 0.2)',
              color: 'var(--accent-floodlight)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <Trophy size={30} />
          </div>

          <h1
            style={{
              fontSize: '2.6rem',
              fontWeight: 900,
              color: isTieOrDraw ? '#FFFFFF' : 'var(--accent-floodlight)',
              lineHeight: 1.1,
              marginBottom: '0.5rem',
              letterSpacing: '0.02em',
            }}
          >
            {winnerName}
          </h1>

          <div
            style={{
              fontFamily: 'var(--font-scoreboard)',
              fontSize: '1.35rem',
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            {resultText}
          </div>

          {room.rules?.ruleSummary && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>
              Played under: {room.rules.ruleSummary}
            </div>
          )}
        </div>

        {/* Final Scoreboard Overview Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem' }}>
            {/* Team A */}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {room.teamA.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: winnerKey === 'teamA' ? 'var(--accent-floodlight)' : 'var(--text-primary)',
                }}
              >
                {isCricket
                  ? `${room.teamA.cricketScore?.runs ?? 0}/${room.teamA.cricketScore?.wickets ?? 0}`
                  : `${room.teamA.footballScore?.goals ?? 0}`}
              </div>
              {isCricket && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {room.battingTeam === 'teamA' && room.cricketState
                    ? `${room.cricketState.oversFormatted} ov`
                    : `${room.rules.oversPerInnings} ov max`}
                </div>
              )}
            </div>

            {/* VS separator */}
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.1rem', color: 'var(--text-tertiary)' }}>
              VS
            </div>

            {/* Team B */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {room.teamB.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: winnerKey === 'teamB' ? 'var(--accent-floodlight)' : 'var(--text-primary)',
                }}
              >
                {isCricket
                  ? `${room.teamB.cricketScore?.runs ?? 0}/${room.teamB.cricketScore?.wickets ?? 0}`
                  : `${room.teamB.footballScore?.goals ?? 0}`}
              </div>
              {isCricket && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {room.battingTeam === 'teamB' && room.cricketState
                    ? `${room.cricketState.oversFormatted} ov`
                    : `${room.rules.oversPerInnings} ov max`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Sport Key Stats */}
        {isCricket && (
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1.25rem',
              marginBottom: '1.75rem',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-floodlight)', marginBottom: '0.75rem' }}>
              Match Summary &amp; Key Stats
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{room.teamA.name}</strong>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  Fours: {room.teamA.cricketScore?.fours ?? 0} &bull; Sixes: {room.teamA.cricketScore?.sixes ?? 0}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Extras: {room.teamA.cricketScore?.extras ?? 0} &bull; Run Rate: {room.teamA.cricketScore?.runRate ?? 0}
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{room.teamB.name}</strong>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  Fours: {room.teamB.cricketScore?.fours ?? 0} &bull; Sixes: {room.teamB.cricketScore?.sixes ?? 0}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Extras: {room.teamB.cricketScore?.extras ?? 0} &bull; Run Rate: {room.teamB.cricketScore?.runRate ?? 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isCricket && footballGoalsEvents.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1.25rem',
              marginBottom: '1.75rem',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-floodlight)', marginBottom: '0.75rem' }}>
              ⚽ Goals Timeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {footballGoalsEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.88rem',
                    padding: '0.35rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>
                    ⚽ {evt.label.replace('⚽', '').trim()}
                  </span>
                  <span style={{ color: 'var(--accent-floodlight)', fontFamily: 'var(--font-scoreboard)' }}>
                    {evt.minute ? `${evt.minute}'` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rematchError && (
          <div style={{ color: 'var(--status-live)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {rematchError}
          </div>
        )}

        {/* Action Buttons: Share, Rematch, Back to Home */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn btn-outline"
              style={{ padding: '0.85rem', gap: '0.5rem' }}
            >
              {copiedLink ? <Check size={18} /> : <Share2 size={18} />}
              {copiedLink ? 'Link Copied!' : 'Share Result'}
            </button>

            <button
              type="button"
              onClick={handleRematch}
              disabled={rematchLoading}
              className="btn btn-primary"
              style={{ padding: '0.85rem', gap: '0.5rem' }}
            >
              <RotateCcw size={18} />
              {rematchLoading ? 'Creating Rematch...' : 'Rematch'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-surface"
            style={{ width: '100%', gap: '0.5rem' }}
          >
            <Home size={18} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
