import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getDeviceId, switchSimulatedDevice } from '../lib/device';
import { Sun, Moon, MapPin, PlusCircle, LogIn, Smartphone, RefreshCw } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const [deviceId, setDeviceId] = useState(getDeviceId());
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  const handleSimulateNewDevice = () => {
    const next = switchSimulatedDevice();
    setDeviceId(next);
    setShowDeviceModal(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="container"
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Brand */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            {/* Stadium Floodlight / Ball Crest */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1.5px solid var(--accent-floodlight)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-floodlight)',
                boxShadow: 'var(--shadow-amber)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18" strokeDasharray="2 2" />
                <path d="M3 12h18" strokeDasharray="2 2" />
              </svg>
            </div>
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                KICK <span style={{ color: 'var(--accent-floodlight)' }}>&amp;</span> CREASE
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Amateur Live Scoring
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <Link
              to="/turfs"
              className={`btn btn-sm ${isActive('/turfs') ? 'btn-primary' : 'btn-surface'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <MapPin size={15} />
              <span>Turfs</span>
            </Link>

            <Link
              to="/create"
              className={`btn btn-sm ${isActive('/create') ? 'btn-primary' : 'btn-surface'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <PlusCircle size={15} />
              <span className="hide-mobile">Create</span>
            </Link>

            <Link
              to="/join"
              className={`btn btn-sm ${isActive('/join') ? 'btn-primary' : 'btn-outline'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <LogIn size={15} />
              <span>Join</span>
            </Link>

            {/* Device Identity chip (helps demonstrate 1-editor-per-team rule) */}
            <button
              onClick={() => setShowDeviceModal(true)}
              title="Current Scorer Device ID"
              aria-label="View Scorer Device ID"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '0.35rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <Smartphone size={13} color="var(--accent-floodlight)" />
              <span style={{ maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deviceId.slice(0, 7)}
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-floodlight)',
                cursor: 'pointer',
              }}
            >
              {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Device Simulator Modal */}
      {showDeviceModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 12, 8, 0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowDeviceModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              maxWidth: '380px',
              width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Device Scorer Profile</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Each device can claim exactly one team editor role. You can switch device IDs here to simulate two scorers on the same machine.
            </p>
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                wordBreak: 'break-all',
                color: 'var(--accent-floodlight)',
                marginBottom: '1.25rem',
              }}
            >
              {deviceId}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={handleSimulateNewDevice}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                <RefreshCw size={14} />
                Switch Device
              </button>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="btn btn-surface btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
