import React, { useEffect, useState } from 'react';

interface FootballClockProps {
  clockRunning: boolean;
  clockAccumulatedMs: number;
  clockLastStartedAt: string | null;
  currentHalf: number;
  halfMinutes: number;
  isExtraTime?: boolean;
}

export const FootballClock: React.FC<FootballClockProps> = ({
  clockRunning,
  clockAccumulatedMs,
  clockLastStartedAt,
  currentHalf,
  halfMinutes,
  isExtraTime = false,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!clockRunning) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => clearInterval(interval);
  }, [clockRunning]);

  // Compute total elapsed milliseconds in current half
  const startedAtMs = clockLastStartedAt ? new Date(clockLastStartedAt).getTime() : 0;
  const elapsedSinceStart = clockRunning && startedAtMs ? Math.max(0, now - startedAtMs) : 0;
  const currentHalfElapsedMs = clockAccumulatedMs + elapsedSinceStart;

  const maxHalfMs = (isExtraTime ? 5 : halfMinutes) * 60 * 1000;
  const boundedElapsedMs = Math.min(maxHalfMs, Math.max(0, currentHalfElapsedMs));

  // Compute minute & second
  const totalSeconds = Math.floor(boundedElapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.35rem 0.85rem',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
          {isExtraTime ? 'Extra Time' : `Half ${currentHalf}`}
        </span>
        <div
          style={{
            fontFamily: 'var(--font-scoreboard)',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: clockRunning ? 'var(--accent-floodlight)' : 'var(--text-secondary)',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span>{displayMinutes}</span>
          <span
            className={clockRunning ? 'clock-colon-pulse' : ''}
            style={{
              display: 'inline-block',
              margin: '0 1px',
              opacity: clockRunning ? undefined : 0.7,
            }}
          >
            :
          </span>
          <span>{displaySeconds}</span>
        </div>
      </div>

      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: clockRunning ? 'var(--status-live)' : '#666666',
          boxShadow: clockRunning ? '0 0 8px var(--status-live)' : 'none',
        }}
        title={clockRunning ? 'Clock Running' : 'Clock Paused'}
      />
    </div>
  );
};
