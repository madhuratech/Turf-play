import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, QrCode, ArrowRight, ShieldCheck, Zap, Users, MapPin } from 'lucide-react';
import { QrScannerModal } from '../components/QrScannerModal';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [quickCode, setQuickCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [inputError, setInputError] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickCode.trim().toUpperCase();
    if (clean.length !== 6) {
      setInputError('Please enter a valid 6-character room code.');
      return;
    }
    navigate(`/room/${clean}`);
  };

  const handleScanDetected = (scannedCode: string) => {
    setShowScanner(false);
    navigate(`/room/${scannedCode}`);
  };

  return (
    <main style={{ flex: 1, paddingBottom: '3rem' }}>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          paddingTop: '3.5rem',
          paddingBottom: '3rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-primary) 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Pitch Line Visual Backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(242, 201, 76, 0.08) 0%, transparent 65%),
                              linear-gradient(90deg, rgba(27, 58, 43, 0.15) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 48px 48px',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(242, 201, 76, 0.12)',
              border: '1px solid rgba(242, 201, 76, 0.3)',
              color: 'var(--accent-floodlight)',
              padding: '0.3rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-scoreboard)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            <Zap size={14} />
            <span>Real-time Amateur Cricket &amp; Football</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.4rem, 6vw, 4rem)',
              lineHeight: 1.05,
              fontWeight: 900,
              maxWidth: '820px',
              margin: '0 auto 1.25rem',
              color: 'var(--text-primary)',
            }}
          >
            NIGHT STADIUM SCORING. <br />
            <span style={{ color: 'var(--accent-floodlight)' }}>ZERO DELAY. ZERO NOISE.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.6,
            }}
          >
            One scorer per team. Live scoreboard updates for spectators via QR code or 6-digit room code. No public feeds or clutter.
          </p>

          {/* TWO PRIMARY ENTRY POINTS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '1.25rem',
              maxWidth: '780px',
              margin: '0 auto',
            }}
          >
            {/* 1. Create a Room Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1.5px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(242, 201, 76, 0.15)',
                    border: '1px solid var(--accent-floodlight)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-floodlight)',
                    marginBottom: '1rem',
                  }}
                >
                  <PlusCircle size={24} />
                </div>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>
                  Create Match Room
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Set up a Cricket or Football match, claim your team, and generate an instant QR code for your opponents &amp; spectators.
                </p>
              </div>

              <button
                onClick={() => navigate('/create')}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <span>Setup New Match</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* 2. Join a Room Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1.5px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                    marginBottom: '1rem',
                  }}
                >
                  <QrCode size={24} />
                </div>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>
                  Join Match Room
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  Enter the 6-character room code or scan the pitch QR code to score or watch in real time.
                </p>
              </div>

              {/* Inline Quick Join Form */}
              <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. KC8291"
                    value={quickCode}
                    onChange={e => {
                      setQuickCode(e.target.value.toUpperCase());
                      setInputError('');
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.7rem 0.85rem',
                      fontFamily: 'var(--font-scoreboard)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: 'var(--accent-floodlight)',
                      textTransform: 'uppercase',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="btn btn-surface"
                    title="Scan QR with Camera"
                    aria-label="Scan QR Code with camera"
                    style={{ padding: '0.7rem 0.85rem' }}
                  >
                    <QrCode size={20} />
                  </button>
                </div>

                {inputError && (
                  <span style={{ color: 'var(--status-live)', fontSize: '0.8rem', fontWeight: 600 }}>
                    {inputError}
                  </span>
                )}

                <button
                  type="submit"
                  className="btn btn-surface"
                  style={{ width: '100%', borderColor: 'var(--accent-floodlight)' }}
                >
                  <span>Enter Room</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Secondary Link: Book a Turf */}
          <div style={{ marginTop: '2.5rem' }}>
            <Link
              to="/turfs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: 'rgba(27, 58, 43, 0.45)',
                border: '1px solid var(--border-subtle)',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
                transition: 'background var(--transition-fast)',
              }}
            >
              <MapPin size={16} color="var(--accent-floodlight)" />
              <span>Looking for floodlit pitches? <strong>Explore Turf Slots in Coimbatore</strong></span>
              <ArrowRight size={14} color="var(--accent-floodlight)" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Rules & Architecture Highlights */}
      <section style={{ padding: '3.5rem 0' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
              }}
            >
              <div style={{ color: 'var(--accent-floodlight)', marginBottom: '0.75rem' }}>
                <ShieldCheck size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
                Private Pitch Access
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                No public feeds or random observers. Only players and spectators with the match QR or 6-digit PIN can view live scores.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
              }}
            >
              <div style={{ color: 'var(--accent-floodlight)', marginBottom: '0.75rem' }}>
                <Users size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
                One Editor Per Team
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Team A and Team B are claimed by their designated scorer device. Everyone else enjoys a clean, distraction-free scoreboard.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
              }}
            >
              <div style={{ color: 'var(--accent-floodlight)', marginBottom: '0.75rem' }}>
                <Zap size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
                Multi-Tab Live Sync
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Instant scoreboard synchronization across devices with zero lag and tactile stadium scoring controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QR Scanner Dialog if triggered */}
      {showScanner && (
        <QrScannerModal
          onDetected={handleScanDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </main>
  );
};
