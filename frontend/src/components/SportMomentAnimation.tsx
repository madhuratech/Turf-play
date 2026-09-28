import React, { useEffect, useState } from 'react';

interface SportMomentProps {
  trigger: 'six' | 'goal' | null;
  onFinished: () => void;
}

export const SportMomentAnimation: React.FC<SportMomentProps> = ({ trigger, onFinished }) => {
  const [active, setActive] = useState<'six' | 'goal' | null>(trigger);

  useEffect(() => {
    if (trigger) {
      setActive(trigger);
      const timer = setTimeout(() => {
        setActive(null);
        onFinished();
      }, 580);
      return () => clearTimeout(timer);
    }
  }, [trigger, onFinished]);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {active === 'six' && (
        <div
          className="anim-cricket-six"
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '1.25rem',
            fontFamily: 'var(--font-scoreboard)',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {/* Cricket Ball SVG */}
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <circle cx="17" cy="17" r="15" fill="#D32F2F" stroke="#B71C1C" strokeWidth="2" />
            <path
              d="M7 17 C 12 7, 22 7, 27 17 C 22 27, 12 27, 7 17"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="2 2"
              fill="none"
            />
          </svg>
          <span
            style={{
              background: 'var(--accent-floodlight)',
              color: '#0F1A14',
              padding: '2px 8px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            6!
          </span>
        </div>
      )}

      {active === 'goal' && (
        <div
          className="anim-football-goal"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(242, 201, 76, 0.35) 0%, rgba(27, 58, 43, 0) 70%)',
          }}
        >
          <div
            style={{
              border: '3px solid var(--accent-floodlight)',
              borderRadius: '50%',
              width: '160px',
              height: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 26, 20, 0.7)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-scoreboard)',
                fontSize: '2.5rem',
                fontWeight: 900,
                color: 'var(--accent-floodlight)',
                letterSpacing: '0.1em',
              }}
            >
              GOAL!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
