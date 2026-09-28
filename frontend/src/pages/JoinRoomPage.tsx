import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoom, createRoom } from '../lib/roomService';
import { QrScannerModal } from '../components/QrScannerModal';
import { ArrowLeft, Camera, QrCode, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length !== 6) {
      setError('Room code must be exactly 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const room = await getRoom(cleanCode);
      if (!room) {
        setError(`No match room found for code "${cleanCode}". Please check with the scorer.`);
        setLoading(false);
        return;
      }
      navigate(`/room/${cleanCode}`);
    } catch (err: any) {
      setError(err.message || 'Error joining room');
      setLoading(false);
    }
  };

  const handleScanDetected = (detectedCode: string) => {
    setShowScanner(false);
    navigate(`/room/${detectedCode}`);
  };

  // Helper to generate a quick demo room if the user is testing
  const handleCreateQuickDemo = async (sport: 'cricket' | 'football') => {
    setLoading(true);
    const demo = await createRoom({
      sport,
      teamAName: sport === 'cricket' ? 'Coimbatore Super Kings' : 'Kovai United FC',
      teamBName: sport === 'cricket' ? 'Peelamedu Titans' : 'PSG Strikers FC',
    });
    navigate(`/room/${demo.code}`);
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3.5rem', maxWidth: '580px' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-outline btn-sm"
        style={{ marginBottom: '1.5rem', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          boxShadow: 'var(--shadow-scoreboard)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              backgroundColor: 'rgba(242, 201, 76, 0.12)',
              border: '1.5px solid var(--accent-floodlight)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-floodlight)',
              margin: '0 auto 1rem',
            }}
          >
            <QrCode size={28} />
          </div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.35rem' }}>Join Match Room</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '380px', margin: '0 auto' }}>
            Scan the pitch scoreboard QR code or type the 6-character room PIN.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem',
              backgroundColor: 'rgba(232, 93, 74, 0.15)',
              border: '1px solid var(--status-live)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-live)',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {/* 6-char Input Form */}
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label
              htmlFor="roomCode"
              style={{
                display: 'block',
                fontFamily: 'var(--font-scoreboard)',
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              Enter 6-Character Room Code
            </label>

            <div style={{ position: 'relative' }}>
              <input
                id="roomCode"
                type="text"
                maxLength={6}
                autoFocus
                autoComplete="off"
                placeholder="e.g. KC8291"
                value={code}
                onChange={e => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '2px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  letterSpacing: '0.25em',
                  color: 'var(--accent-floodlight)',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length !== 6}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', opacity: code.trim().length !== 6 ? 0.6 : 1 }}
          >
            <span>{loading ? 'Locating Room...' : 'Enter Scoreboard'}</span>
            <ArrowRight size={20} />
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '1.75rem 0',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-scoreboard)',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          <span>OR CAMERA SCAN</span>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
        </div>

        {/* QR Scanner Trigger Button */}
        <button
          onClick={() => setShowScanner(true)}
          className="btn btn-surface btn-lg"
          style={{ width: '100%', borderColor: 'var(--accent-floodlight)' }}
        >
          <Camera size={22} color="var(--accent-floodlight)" />
          <span>Scan Match QR Code</span>
        </button>

        {/* Privacy Note */}
        <div
          style={{
            marginTop: '1.75rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <ShieldCheck size={20} color="var(--accent-floodlight)" />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            Kick &amp; Crease matches are private by design. Scores are never listed on public browse lists.
          </p>
        </div>

        {/* Quick Demo match generation helper */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px dashed var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '0.6rem' }}>
            Testing or testing dual-device sync? Launch a live demo match:
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
            <button
              onClick={() => handleCreateQuickDemo('cricket')}
              className="btn btn-surface btn-sm"
              style={{ fontSize: '0.82rem' }}
            >
              <Sparkles size={14} color="var(--accent-floodlight)" />
              Cricket Demo
            </button>
            <button
              onClick={() => handleCreateQuickDemo('football')}
              className="btn btn-surface btn-sm"
              style={{ fontSize: '0.82rem' }}
            >
              <Sparkles size={14} color="var(--accent-floodlight)" />
              Football Demo
            </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <QrScannerModal
          onDetected={handleScanDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
