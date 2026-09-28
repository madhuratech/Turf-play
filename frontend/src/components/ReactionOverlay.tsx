import React, { useEffect, useState, useRef } from 'react';
import type { LastEvent } from '../types';
import { playSound } from '../lib/soundEffects';

interface ReactionOverlayProps {
  lastEvent: LastEvent | null;
  scoringTeamColor?: string;
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({
  lastEvent,
  scoringTeamColor = '#3B82F6',
}) => {
  const [current, setCurrent] = useState<LastEvent | null>(null);
  const queueRef = useRef<LastEvent[]>([]);
  const isPlayingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // prefers-reduced-motion check
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.kind === 'dot') return; // DOT: no overlay animation

    // Skip if document is hidden (background tab)
    if (typeof document !== 'undefined' && document.hidden) return;

    // Queue management: drop oldest if > 3
    if (queueRef.current.length >= 3) {
      queueRef.current = [lastEvent]; // Keep latest
    } else {
      queueRef.current.push(lastEvent);
    }

    if (!isPlayingRef.current) {
      playNext();
    }
  }, [lastEvent?.id, lastEvent?.kind]);

  const playNext = () => {
    if (queueRef.current.length === 0) {
      setCurrent(null);
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const next = queueRef.current.shift()!;
    setCurrent(next);

    // Play synthesized sound
    if (next.kind === 'six') playSound('six');
    else if (next.kind === 'four') playSound('four');
    else if (next.kind === 'wicket') playSound('wicket');
    else if (next.kind === 'goal' || next.kind === 'penalty') playSound('goal');

    const duration =
      next.kind === 'half_start' || next.kind === 'half_end' || next.kind === 'match_end'
        ? 2000
        : isReducedMotion
        ? 1500
        : 1400;

    setTimeout(() => {
      playNext();
    }, duration);
  };

  if (!current) return null;

  // Reduced motion: clean static banner
  if (isReducedMotion) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: '#0F172A',
          color: '#FFF',
          padding: '0.75rem 1.5rem',
          borderRadius: '999px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.15)',
          fontSize: '1rem',
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        {current.text || current.kind.toUpperCase()}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* ======================= SIX ANIMATION ======================= */}
      {current.kind === 'six' && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Subtle Stadium Skyline Silhouette */}
          <svg
            style={{
              position: 'absolute',
              bottom: '10%',
              width: '100%',
              height: '140px',
              opacity: 0.25,
            }}
            viewBox="0 0 1000 140"
            preserveAspectRatio="none"
          >
            <path
              d="M0,140 L0,90 Q150,30 300,90 L400,85 Q500,10 600,85 L700,90 Q850,30 1000,90 L1000,140 Z"
              fill="#94A3B8"
            />
          </svg>

          {/* Arcing ball SVG */}
          <div
            style={{
              position: 'absolute',
              width: '40px',
              height: '40px',
              animation: 'kc-six-arc 1.25s cubic-bezier(0.25, 1, 0.5, 1) forwards',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #F43F5E, #9F1239)',
                boxShadow: '0 0 20px rgba(244, 63, 94, 0.8), 0 0 40px rgba(251, 146, 60, 0.6)',
                border: '2px solid #FFF',
              }}
            />
          </div>

          {/* "SIX!" scaling text */}
          <div
            style={{
              animation: 'kc-six-text 1.25s ease-out forwards',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 'clamp(5rem, 16vw, 9rem)',
                fontWeight: 900,
                letterSpacing: '2px',
                background: 'linear-gradient(180deg, #FDE047 0%, #EA580C 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 10px 40px rgba(234, 88, 12, 0.5)',
                lineHeight: 1,
              }}
            >
              SIX!
            </div>
            {current.playerName && (
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  marginTop: '0.5rem',
                }}
              >
                {current.playerName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= FOUR ANIMATION ======================= */}
      {current.kind === 'four' && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Ground & boundary rope stripe */}
          <div
            style={{
              position: 'absolute',
              bottom: '22%',
              left: 0,
              right: 0,
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.4)',
              boxShadow: '0 0 12px #38BDF8',
            }}
          />

          {/* Boundary rope flash marker */}
          <div
            style={{
              position: 'absolute',
              bottom: '21%',
              right: '15%',
              width: '8px',
              height: '16px',
              backgroundColor: '#FACC15',
              animation: 'kc-flash 0.3s ease-out 0.6s 2',
            }}
          />

          {/* Skimming cricket ball */}
          <div
            style={{
              position: 'absolute',
              bottom: '22%',
              left: '-50px',
              animation: 'kc-four-skim 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #38BDF8, #0369A1)',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.9)',
                border: '2px solid #FFF',
              }}
            />
          </div>

          {/* "FOUR!" sliding in */}
          <div
            style={{
              animation: 'kc-four-text 1.1s ease-out forwards',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 'clamp(4.5rem, 14vw, 8rem)',
                fontWeight: 900,
                letterSpacing: '2px',
                background: 'linear-gradient(180deg, #38BDF8 0%, #2563EB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 8px 32px rgba(37, 99, 235, 0.5)',
                lineHeight: 1,
              }}
            >
              FOUR!
            </div>
            {current.playerName && (
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  marginTop: '0.4rem',
                }}
              >
                {current.playerName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= WICKET ANIMATION ======================= */}
      {current.kind === 'wicket' && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Red edge vignette pulse */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.7)',
              animation: 'kc-vignette 1.2s ease-out forwards',
            }}
          />

          <div style={{ textAlign: 'center', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Stumps & Bails SVG */}
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
              {/* Bails popping off */}
              <rect
                x="34"
                y="18"
                width="24"
                height="5"
                rx="2"
                fill="#FBBF24"
                style={{ animation: 'kc-bail-left 1.2s ease-out forwards' }}
              />
              <rect
                x="62"
                y="18"
                width="24"
                height="5"
                rx="2"
                fill="#FBBF24"
                style={{ animation: 'kc-bail-right 1.2s ease-out forwards' }}
              />
              {/* 3 Stumps tilting */}
              <rect
                x="36"
                y="24"
                width="8"
                height="80"
                rx="3"
                fill="#F8FAFC"
                style={{
                  transformOrigin: '40px 104px',
                  animation: 'kc-stump-tilt-left 1.2s ease-out forwards',
                }}
              />
              <rect
                x="56"
                y="24"
                width="8"
                height="80"
                rx="3"
                fill="#F8FAFC"
                style={{
                  transformOrigin: '60px 104px',
                  animation: 'kc-stump-tilt-center 1.2s ease-out forwards',
                }}
              />
              <rect
                x="76"
                y="24"
                width="8"
                height="80"
                rx="3"
                fill="#F8FAFC"
                style={{
                  transformOrigin: '80px 104px',
                  animation: 'kc-stump-tilt-right 1.2s ease-out forwards',
                }}
              />
            </svg>

            {/* Wicket Text */}
            <div
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 'clamp(3.5rem, 10vw, 6rem)',
                fontWeight: 900,
                color: '#EF4444',
                textShadow: '0 4px 24px rgba(239, 68, 68, 0.6)',
                letterSpacing: '1px',
                lineHeight: 1,
                marginTop: '1rem',
                animation: 'kc-fade-up 1.2s ease-out forwards',
              }}
            >
              WICKET!
            </div>

            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: '#FFF',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                marginTop: '0.5rem',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                animation: 'kc-fade-up 1.2s ease-out 0.1s forwards',
              }}
            >
              {current.playerName
                ? `${current.wicketType ? current.wicketType.toUpperCase() : 'OUT'} — ${current.playerName}`
                : current.wicketType
                ? current.wicketType.toUpperCase()
                : 'OUT!'}
            </div>
          </div>
        </div>
      )}

      {/* ======================= GOAL ANIMATION ======================= */}
      {(current.kind === 'goal' || current.kind === 'penalty' || current.kind === 'own_goal') && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Accent Color Wash */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: scoringTeamColor,
              opacity: 0.15,
              animation: 'kc-color-wash 1.3s ease-out forwards',
            }}
          />

          {/* Goal Net Ripple SVG */}
          <svg
            style={{
              position: 'absolute',
              width: '320px',
              height: '240px',
              opacity: 0.35,
              animation: 'kc-net-ripple 1.3s ease-out forwards',
            }}
            viewBox="0 0 320 240"
          >
            <defs>
              <pattern id="net-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="320" height="240" fill="url(#net-grid)" />
          </svg>

          {/* Fast ball into net */}
          <div
            style={{
              position: 'absolute',
              animation: 'kc-goal-ball 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 0 25px rgba(255,255,255,0.9), 0 0 50px ' + scoringTeamColor,
                border: '3px solid #0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
              }}
            >
              ⚽
            </div>
          </div>

          {/* GOAL! Text Banner */}
          <div style={{ textAlign: 'center', zIndex: 2, animation: 'kc-goal-text 1.3s ease-out forwards' }}>
            <div
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 'clamp(5rem, 16vw, 9rem)',
                fontWeight: 900,
                letterSpacing: '3px',
                background: `linear-gradient(180deg, #FFFFFF 0%, ${scoringTeamColor} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: `0 8px 40px ${scoringTeamColor}`,
                lineHeight: 1,
              }}
            >
              {current.kind === 'penalty' ? 'PENALTY!' : current.kind === 'own_goal' ? 'OWN GOAL' : 'GOAL!'}
            </div>
            {current.playerName && (
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                  marginTop: '0.5rem',
                }}
              >
                {current.playerName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= WIDE / NO BALL POP ======================= */}
      {(current.kind === 'wide' || current.kind === 'no_ball') && (
        <div
          style={{
            position: 'absolute',
            top: '25%',
            animation: 'kc-flag-pop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            backgroundColor: '#0F172A',
            color: current.kind === 'wide' ? '#F59E0B' : '#EF4444',
            border: `2px solid ${current.kind === 'wide' ? '#F59E0B' : '#EF4444'}`,
            padding: '0.65rem 1.5rem',
            borderRadius: '999px',
            fontSize: '1.2rem',
            fontWeight: 800,
            letterSpacing: '1px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}
        >
          🚩 {current.kind === 'wide' ? 'WIDE BALL' : 'NO BALL'}
        </div>
      )}

      {/* ======================= HALF-TIME / FULL-TIME / INNINGS BREAK ======================= */}
      {(current.kind === 'half_start' || current.kind === 'half_end' || current.kind === 'match_end') && (
        <div
          style={{
            animation: 'kc-whistle-banner 1.8s ease-out forwards',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            borderRadius: '16px',
            padding: '1.25rem 2.5rem',
            textAlign: 'center',
            color: '#F8FAFC',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⏱️</div>
          <div
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '1px',
            }}
          >
            {current.text}
          </div>
        </div>
      )}

      {/* Keyframe Styles */}
      <style>{`
        @keyframes kc-six-arc {
          0% {
            left: 15%;
            bottom: 20%;
            transform: scale(0.6);
            opacity: 1;
          }
          50% {
            left: 50%;
            bottom: 75%;
            transform: scale(1.4);
            opacity: 1;
          }
          100% {
            left: 85%;
            bottom: 25%;
            transform: scale(0.8);
            opacity: 0;
          }
        }

        @keyframes kc-six-text {
          0% {
            transform: scale(0.3) translateY(40px);
            opacity: 0;
          }
          20% {
            transform: scale(1.1) translateY(0);
            opacity: 1;
          }
          35% {
            transform: scale(1);
            opacity: 1;
          }
          80% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.05);
            opacity: 0;
          }
        }

        @keyframes kc-four-skim {
          0% {
            left: 5%;
            opacity: 1;
          }
          70% {
            left: 85%;
            opacity: 1;
          }
          100% {
            left: 105%;
            opacity: 0;
          }
        }

        @keyframes kc-flash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; filter: drop-shadow(0 0 10px #FACC15); }
        }

        @keyframes kc-four-text {
          0% {
            transform: translateX(-80px);
            opacity: 0;
          }
          25% {
            transform: translateX(0);
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateX(30px);
            opacity: 0;
          }
        }

        @keyframes kc-vignette {
          0% { opacity: 0; }
          30% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes kc-bail-left {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50px, -70px) rotate(-140deg); opacity: 0; }
        }

        @keyframes kc-bail-right {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(55px, -65px) rotate(160deg); opacity: 0; }
        }

        @keyframes kc-stump-tilt-left {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(-25deg); }
          100% { transform: rotate(-30deg); opacity: 0.7; }
        }

        @keyframes kc-stump-tilt-center {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(10deg); }
          100% { transform: rotate(12deg); opacity: 0.7; }
        }

        @keyframes kc-stump-tilt-right {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(28deg); }
          100% { transform: rotate(32deg); opacity: 0.7; }
        }

        @keyframes kc-fade-up {
          0% { transform: translateY(20px); opacity: 0; }
          20% { transform: translateY(0); opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes kc-color-wash {
          0% { opacity: 0; }
          25% { opacity: 0.35; }
          80% { opacity: 0.2; }
          100% { opacity: 0; }
        }

        @keyframes kc-net-ripple {
          0% { transform: scale(0.9); opacity: 0; }
          30% { transform: scale(1.05) skewX(2deg); opacity: 0.5; }
          60% { transform: scale(1) skewX(-1deg); opacity: 0.4; }
          100% { opacity: 0; }
        }

        @keyframes kc-goal-ball {
          0% { transform: scale(0.4) translate(-200px, 80px); opacity: 0; }
          35% { transform: scale(1.1) translate(0, 0); opacity: 1; }
          100% { transform: scale(1) translate(10px, -5px); opacity: 0; }
        }

        @keyframes kc-goal-text {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1.1); opacity: 1; }
          35% { transform: scale(1); opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes kc-flag-pop {
          0% { transform: scale(0.4) translateY(20px); opacity: 0; }
          20% { transform: scale(1.1) translateY(0); opacity: 1; }
          30% { transform: scale(1); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: scale(0.9) translateY(-10px); opacity: 0; }
        }

        @keyframes kc-whistle-banner {
          0% { transform: translateY(-50px); opacity: 0; }
          15% { transform: translateY(0); opacity: 1; }
          85% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
