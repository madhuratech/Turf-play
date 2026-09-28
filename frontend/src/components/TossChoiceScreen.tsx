import React, { useState } from 'react';
import type { MatchRoom, TossChoice } from '../types';
import { submitTossChoice } from '../lib/roomService';
import { Trophy, Clock, ShieldCheck } from 'lucide-react';

interface TossChoiceScreenProps {
  room: MatchRoom;
  deviceId: string;
}

export const TossChoiceScreen: React.FC<TossChoiceScreenProps> = ({ room, deviceId }) => {
  const [submitting, setSubmitting] = useState(false);
  const [choiceError, setChoiceError] = useState<string | null>(null);

  const isCricket = room.sport === 'cricket';
  const winner = room.tossWinner || 'teamA';
  const winnerName = room[winner].name;
  const isWinningEditor = room.claims[winner] === deviceId;

  const handleChoice = async (choice: TossChoice) => {
    if (submitting) return;
    setSubmitting(true);
    setChoiceError(null);

    try {
      const res = await submitTossChoice(room.code, choice, deviceId);
      if (!res.success && res.error) {
        setChoiceError(res.error);
        setSubmitting(false);
      }
    } catch (err: any) {
      setChoiceError(err.message || 'Choice selection failed');
      setSubmitting(false);
    }
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
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="badge badge-amber">
            Phase 3: Opening Match Decision
          </span>
        </div>

        {/* Toss Winner Announcement */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.9rem',
            backgroundColor: 'rgba(242, 201, 76, 0.15)',
            border: '1px solid var(--accent-floodlight)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--accent-floodlight)',
            fontSize: '0.9rem',
            fontWeight: 800,
            fontFamily: 'var(--font-scoreboard)',
            marginBottom: '1rem',
          }}
        >
          <Trophy size={16} />
          <span>{winnerName} won the toss</span>
        </div>

        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem', lineHeight: 1.1 }}>
          {isWinningEditor ? 'Make Your First Choice' : 'Waiting for Decision'}
        </h1>

        {room.rules?.ruleSummary && (
          <div
            style={{
              display: 'inline-block',
              margin: '0.2rem auto 0.9rem',
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

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
          {isWinningEditor
            ? `As the toss winner, choose your team's opening play. Rules are now locked.`
            : `Waiting for ${winnerName}'s captain/scorer to submit their opening choice...`}
        </p>

        {choiceError && (
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
            {choiceError}
          </div>
        )}

        {isWinningEditor ? (
          /* Winning Captain / Scorer Options */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '440px', margin: '0 auto' }}>
            {isCricket ? (
              <>
                <button
                  onClick={() => handleChoice('bat')}
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                  style={{
                    padding: '1.5rem 1rem',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow-amber)',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>🏏</span>
                  <span style={{ fontSize: '1.4rem' }}>BAT FIRST</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
                    Set the target
                  </span>
                </button>

                <button
                  onClick={() => handleChoice('bowl')}
                  disabled={submitting}
                  className="btn btn-surface btn-lg"
                  style={{
                    padding: '1.5rem 1rem',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>⚾</span>
                  <span style={{ fontSize: '1.4rem' }}>BOWL FIRST</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Field &amp; chase later
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleChoice('kickoff')}
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                  style={{
                    padding: '1.5rem 1rem',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow-amber)',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>⚽</span>
                  <span style={{ fontSize: '1.3rem' }}>KICK OFF FIRST</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
                    Take opening ball
                  </span>
                </button>

                <button
                  onClick={() => handleChoice('side')}
                  disabled={submitting}
                  className="btn btn-surface btn-lg"
                  style={{
                    padding: '1.5rem 1rem',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>🚩</span>
                  <span style={{ fontSize: '1.3rem' }}>CHOOSE A SIDE</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Defend preferred goal
                  </span>
                </button>
              </>
            )}
          </div>
        ) : (
          /* Waiting Screen for losing editor and viewers */
          <div
            style={{
              padding: '2rem 1.5rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Clock size={28} color="var(--accent-floodlight)" />
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.35rem', fontWeight: 700 }}>
              {winnerName} IS CHOOSING...
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '360px', margin: 0 }}>
              {isCricket
                ? 'They will decide whether to bat or bowl first. The scoreboard will unlock immediately once submitted.'
                : 'They will decide whether to kick off or choose a side. The scoreboard will unlock immediately once submitted.'}
            </p>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
          <ShieldCheck size={14} color="var(--accent-floodlight)" />
          <span>Real-time match room sync &bull; {room.code}</span>
        </div>
      </div>
    </div>
  );
};
