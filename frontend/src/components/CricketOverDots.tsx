import React from 'react';
import type { ScoreEvent } from '../types';

interface CricketOverDotsProps {
  legalBalls: number;
  events?: ScoreEvent[];
}

export const CricketOverDots: React.FC<CricketOverDotsProps> = ({ legalBalls, events = [] }) => {
  const currentOverBalls = legalBalls % 6;

  // Find extras in current over (events since the last over break)
  const currentOverEvents = events.slice(0, 10);
  const hasRecentExtra = currentOverEvents.some(
    (e) => (e.eventType === 'wide' || e.eventType === 'no_ball') && !e.undone
  );

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.35rem 0.75rem',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
        This Over:
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {[0, 1, 2, 3, 4, 5].map((ballIndex) => {
          const isFilled = ballIndex < currentOverBalls;
          return (
            <div
              key={ballIndex}
              title={`Ball ${ballIndex + 1} of 6`}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isFilled ? 'var(--accent-floodlight)' : 'transparent',
                border: isFilled
                  ? '1.5px solid var(--accent-floodlight)'
                  : '1.5px solid var(--border-strong)',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                transform: isFilled ? 'scale(1.05)' : 'scale(1)',
              }}
            />
          );
        })}

        {hasRecentExtra && (
          <span
            title="Extra (Wide or No Ball) in this over"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '1.5px dashed var(--accent-floodlight)',
              backgroundColor: 'rgba(242, 201, 76, 0.2)',
              fontSize: '0.6rem',
              color: 'var(--accent-floodlight)',
              marginLeft: '0.2rem',
            }}
          >
            +
          </span>
        )}
      </div>

      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-scoreboard)' }}>
        ({currentOverBalls}/6)
      </span>
    </div>
  );
};
