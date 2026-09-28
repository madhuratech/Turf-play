import React, { useState } from 'react';
import type { MatchRoom, TeamKey } from '../types';
import { claimTeam } from '../lib/roomService';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, ArrowLeft, Loader2, Sparkles, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WaitingScreenProps {
  room: MatchRoom;
  deviceId: string;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({ room, deviceId }) => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${room.code}`
    : `/room/${room.code}`;

  const isTeamAClaimed = Boolean(room.claims.teamA);
  const isTeamBClaimed = Boolean(room.claims.teamB);
  const isMyClaimTeamA = room.claims.teamA === deviceId;
  const isMyClaimTeamB = room.claims.teamB === deviceId;
  const isSpectator = !isMyClaimTeamA && !isMyClaimTeamB;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleClaim = async (team: TeamKey) => {
    setClaimError(null);
    try {
      const res = await claimTeam(room.code, team, deviceId);
      if (!res.success && res.error) {
        setClaimError(res.error);
      }
    } catch (err: any) {
      setClaimError(err.message || 'Claim failed');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3.5rem', maxWidth: '680px' }}>
      <button
        onClick={() => navigate('/')}
        className="btn btn-outline btn-sm"
        style={{ marginBottom: '1.5rem', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} />
        Back to Home
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
        {/* Header Status */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(242, 201, 76, 0.15)',
              border: '1px solid var(--accent-floodlight)',
              color: 'var(--accent-floodlight)',
              fontFamily: 'var(--font-scoreboard)',
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            <Loader2 size={14} className="spin-slow" />
            <span>Room Open &bull; Phase 1: Waiting for Opponent</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem', lineHeight: 1.1 }}>
            Waiting for Opponent Scorer
          </h1>

          {room.rules?.ruleSummary && (
            <div
              style={{
                display: 'inline-block',
                margin: '0.4rem auto 0.75rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(242, 201, 76, 0.12)',
                border: '1px solid rgba(242, 201, 76, 0.4)',
                color: 'var(--accent-floodlight)',
                fontFamily: 'var(--font-scoreboard)',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              📋 {room.rules.ruleSummary}
            </div>
          )}

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto' }}>
            Share the room code or QR code with the other team. As soon as both teams are claimed, the coin toss begins automatically!
          </p>
        </div>

        {claimError && (
          <div
            style={{
              padding: '0.85rem',
              backgroundColor: 'rgba(232, 93, 74, 0.15)',
              border: '1px solid var(--status-live)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-live)',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            {claimError}
          </div>
        )}

        {/* =========================================================================
            TEAM CLAIM STATUS BOXES
            ========================================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {/* Team A Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: isMyClaimTeamA
                ? '2px solid var(--accent-floodlight)'
                : isTeamAClaimed
                ? '1px solid var(--border-strong)'
                : '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Team 1
                </span>
                {isMyClaimTeamA ? (
                  <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                    Claimed by You
                  </span>
                ) : isTeamAClaimed ? (
                  <span className="badge badge-muted" style={{ fontSize: '0.72rem' }}>
                    Claimed by Opponent
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--status-live)',
                      backgroundColor: 'rgba(232, 93, 74, 0.12)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                    }}
                  >
                    Open
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
                {room.teamA.name}
              </h2>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              {isMyClaimTeamA ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-floodlight)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Check size={14} /> Ready for toss
                </div>
              ) : isTeamAClaimed ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Smartphone size={14} /> Scorer connected
                </div>
              ) : isSpectator ? (
                <button
                  onClick={() => handleClaim('teamA')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  Claim &amp; Score for {room.teamA.name}
                </button>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  Awaiting opponent to scan
                </div>
              )}
            </div>
          </div>

          {/* Team B Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: isMyClaimTeamB
                ? '2px solid var(--accent-floodlight)'
                : isTeamBClaimed
                ? '1px solid var(--border-strong)'
                : '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Team 2
                </span>
                {isMyClaimTeamB ? (
                  <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                    Claimed by You
                  </span>
                ) : isTeamBClaimed ? (
                  <span className="badge badge-muted" style={{ fontSize: '0.72rem' }}>
                    Claimed by Opponent
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--status-live)',
                      backgroundColor: 'rgba(232, 93, 74, 0.12)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                    }}
                  >
                    Open
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
                {room.teamB.name}
              </h2>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              {isMyClaimTeamB ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-floodlight)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Check size={14} /> Ready for toss
                </div>
              ) : isTeamBClaimed ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Smartphone size={14} /> Scorer connected
                </div>
              ) : isSpectator ? (
                <button
                  onClick={() => handleClaim('teamB')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  Claim &amp; Score for {room.teamB.name}
                </button>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  Awaiting opponent to scan
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROOM CODE & QR SHARING CONTAINER
            ========================================================================= */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                display: 'inline-block',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              }}
            >
              {room.qrImageBase64 ? (
                <img
                  src={room.qrImageBase64}
                  alt={`QR Code for Room ${room.code}`}
                  width={150}
                  height={150}
                  style={{ display: 'block', borderRadius: '4px' }}
                />
              ) : (
                <QRCodeSVG value={joinUrl} size={150} level="M" />
              )}
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Match Room Code
              </span>
              <div
                style={{
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  color: 'var(--accent-floodlight)',
                  letterSpacing: '0.15em',
                  lineHeight: 1,
                  marginTop: '0.2rem',
                }}
              >
                {room.code}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', width: '100%', maxWidth: '380px' }}>
              <button
                onClick={handleCopyCode}
                className="btn btn-surface btn-sm"
                style={{ flex: 1 }}
              >
                {copiedCode ? <Check size={15} color="var(--status-success)" /> : <Copy size={15} />}
                <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                {copiedLink ? <Check size={15} /> : <QrCode size={15} />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live sync reassurance footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(27, 58, 43, 0.3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Sparkles size={18} color="var(--accent-floodlight)" />
          <span>
            Auto-advancing enabled: As soon as another device opens this link and claims the open team, this screen will transition to the Coin Toss automatically.
          </span>
        </div>
      </div>
    </div>
  );
};
