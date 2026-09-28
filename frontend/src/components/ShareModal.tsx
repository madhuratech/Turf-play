import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface ShareModalProps {
  code: string;
  sport: string;
  teamAName: string;
  teamBName: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  code,
  sport,
  teamAName,
  teamBName,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${code}`
    : `/room/${code}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 8, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-scoreboard)',
          maxWidth: '420px',
          width: '100%',
          padding: '1.75rem',
          color: 'var(--text-primary)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <span className="badge badge-amber" style={{ marginBottom: '0.25rem' }}>
              {sport} MATCH
            </span>
            <h2 id="share-modal-title" style={{ fontSize: '1.5rem', marginTop: '0.2rem' }}>
              Share Room
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share dialog"
            style={{
              padding: '0.5rem',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          {teamAName} vs {teamBName}
          <br />
          Scan QR or enter code to view scores or claim a team.
        </p>

        {/* QR Code Container */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            marginBottom: '1.25rem',
          }}
        >
          <QRCodeSVG
            value={joinUrl}
            size={190}
            level="M"
            includeMargin={false}
            fgColor="#0F1A14"
            bgColor="#FFFFFF"
          />
        </div>

        {/* Room Code Display */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Room Code
            </div>
            <div
              style={{
                fontFamily: 'var(--font-scoreboard)',
                fontSize: '1.9rem',
                fontWeight: 800,
                color: 'var(--accent-floodlight)',
                letterSpacing: '0.12em',
              }}
            >
              {code}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="btn btn-surface btn-sm"
            style={{ padding: '0.5rem 0.9rem' }}
          >
            {copiedCode ? <Check size={16} color="var(--status-success)" /> : <Copy size={16} />}
            {copiedCode ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleCopyLink}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            {copiedLink ? <Check size={18} /> : <Share2 size={18} />}
            {copiedLink ? 'Link Copied!' : 'Copy Match Link'}
          </button>
        </div>
      </div>
    </div>
  );
};
