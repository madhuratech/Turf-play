import React, { useState, useEffect, useRef } from 'react';
import type { MatchRoom } from '../types';
import { triggerCoinToss, advanceTossToChoice } from '../lib/roomService';
import { Sparkles, Trophy, FastForward, Loader2 } from 'lucide-react';

interface CoinTossScreenProps {
  room: MatchRoom;
  deviceId: string;
}

export const CoinTossScreen: React.FC<CoinTossScreenProps> = ({ room, deviceId }) => {
  const [flipping, setFlipping] = useState(false);
  const [animationSettled, setAnimationSettled] = useState(false);
  const [flipRequested, setFlipRequested] = useState(false);
  const [tossError, setTossError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const isEditorA = room.claims.teamA === deviceId;
  const isEditorB = room.claims.teamB === deviceId;
  const isEditor = isEditorA || isEditorB;

  const isCricket = room.sport === 'cricket';
  const winnerTeam = room.tossWinner;
  const winnerName = winnerTeam ? room[winnerTeam].name : '';

  // Trigger flip animation when room enters toss_result phase
  useEffect(() => {
    if (room.phase === 'toss_result') {
      setFlipping(true);
      setAnimationSettled(false);

      // Animation duration ~1.2s
      timerRef.current = window.setTimeout(() => {
        setFlipping(false);
        setAnimationSettled(true);

        // After a brief beat (~1.2s), auto-advance to choice_pending
        advanceTimerRef.current = window.setTimeout(() => {
          advanceTossToChoice(room.code);
        }, 1200);
      }, 1250);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      };
    }
  }, [room.phase, room.code]);

  const handleFlipCoin = async () => {
    if (flipRequested || room.phase !== 'toss_pending') return;
    setFlipRequested(true);
    setTossError(null);

    try {
      const res = await triggerCoinToss(room.code, deviceId);
      if (!res.success && res.error) {
        setTossError(res.error);
        setFlipRequested(false);
      }
    } catch (err: any) {
      setTossError(err.message || 'Coin flip failed');
      setFlipRequested(false);
    }
  };

  const handleSkipAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFlipping(false);
    setAnimationSettled(true);
    advanceTossToChoice(room.code);
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3.5rem', maxWidth: '580px', textAlign: 'center' }}>
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.75rem',
          boxShadow: 'var(--shadow-scoreboard)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Phase Badge */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="badge badge-amber">
            Phase 2: Official Match Toss
          </span>
        </div>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.4rem', lineHeight: 1.1 }}>
          {room.phase === 'toss_result' && animationSettled
            ? `${winnerName.toUpperCase()} WINS THE TOSS!`
            : 'COIN TOSS'}
        </h1>

        {room.rules?.ruleSummary && (
          <div
            style={{
              display: 'inline-block',
              margin: '0.2rem auto 1rem',
              padding: '0.3rem 0.8rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(242, 201, 76, 0.12)',
              border: '1px solid rgba(242, 201, 76, 0.35)',
              color: 'var(--accent-floodlight)',
              fontFamily: 'var(--font-scoreboard)',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            📋 {room.rules.ruleSummary}
          </div>
        )}

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2.25rem' }}>
          {room.phase === 'toss_result' && animationSettled
            ? 'Advancing to the opening decision...'
            : `${room.teamA.name} vs ${room.teamB.name}`}
        </p>

        {tossError && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(232, 93, 74, 0.15)',
              border: '1px solid var(--status-live)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-live)',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
            }}
          >
            {tossError}
          </div>
        )}

        {/* =========================================================================
            COIN VISUALIZATION (THEMED 2D COIN WITH 3D FLIP)
            ========================================================================= */}
        <div
          style={{
            position: 'relative',
            height: '190px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            perspective: '1000px',
          }}
        >
          <div
            className={flipping ? 'coin-flipping' : ''}
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              backgroundColor: '#E5A919',
              background: 'radial-gradient(circle at 35% 35%, #FFE270 0%, #E5A919 60%, #9B7005 100%)',
              border: '4px solid #FDF0B0',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6), inset 0 2px 6px rgba(255, 255, 255, 0.6), 0 0 25px rgba(242, 201, 76, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F1A14',
              userSelect: 'none',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.4s ease',
            }}
          >
            {/* Inner coin ring */}
            <div
              style={{
                width: '116px',
                height: '116px',
                borderRadius: '50%',
                border: '2px dashed rgba(15, 26, 20, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>
                {isCricket ? '🏏' : '⚽'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#0F1A14',
                  marginTop: '4px',
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {winnerTeam && animationSettled ? room[winnerTeam].name : 'K&C'}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            INTERACTIVE CONTROLS
            ========================================================================= */}
        {room.phase === 'toss_pending' ? (
          <div>
            {isEditor ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '360px', margin: '0 auto' }}>
                <button
                  onClick={handleFlipCoin}
                  disabled={flipRequested}
                  className="btn btn-primary btn-lg"
                  style={{
                    width: '100%',
                    boxShadow: 'var(--shadow-amber)',
                    padding: '1.1rem',
                    fontSize: '1.35rem',
                  }}
                >
                  <Sparkles size={20} />
                  <span>{flipRequested ? 'Flipping...' : 'Flip the Coin'}</span>
                </button>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  Either team editor can tap to flip (first tap triggers the toss).
                </div>
              </div>
            ) : (
              /* Viewer state */
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.92rem',
                }}
              >
                <Loader2 size={16} className="spin-slow" />
                <span>Waiting for team captains to flip the coin...</span>
              </div>
            )}
          </div>
        ) : (
          /* toss_result state */
          <div>
            {flipping ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.25rem', color: 'var(--accent-floodlight)' }}>
                  COIN IS IN THE AIR...
                </div>
                <button
                  onClick={handleSkipAnimation}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.82rem', gap: '0.35rem' }}
                >
                  <FastForward size={14} />
                  Skip animation
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(242, 201, 76, 0.15)',
                  border: '1.5px solid var(--accent-floodlight)',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--accent-floodlight)',
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                <Trophy size={20} />
                <span>{winnerName} won the toss!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
