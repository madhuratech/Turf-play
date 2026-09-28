import React from 'react';

interface LiveIndicatorProps {
  label?: string;
  size?: 'sm' | 'md';
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ label = 'LIVE', size = 'md' }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'rgba(232, 93, 74, 0.14)',
        border: '1px solid rgba(232, 93, 74, 0.45)',
        color: 'var(--status-live)',
        fontFamily: 'var(--font-scoreboard)',
        fontWeight: 800,
        fontSize: size === 'sm' ? '0.75rem' : '0.85rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
      aria-label="Match is live"
    >
      <span className="live-pulse-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
};
