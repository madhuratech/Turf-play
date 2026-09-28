import React, { useState } from 'react';
import type { MatchRoom, TeamKey } from '../types';
import { X, Check, SkipForward } from 'lucide-react';

interface WicketSheetProps {
  isOpen: boolean;
  onClose: () => void;
  room: MatchRoom;
  battingTeamKey: TeamKey;
  onConfirm: (data: {
    wicketType: string;
    dismissedPlayerId?: string | null;
    fielderId?: string | null;
    newBatterId?: string | null;
    runsOffBat?: number;
  }) => void;
}

export const WicketSheet: React.FC<WicketSheetProps> = ({
  isOpen,
  onClose,
  room,
  battingTeamKey,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const battingTeam = battingTeamKey === 'teamA' ? room.teamA : room.teamB;
  const fieldingTeam = battingTeamKey === 'teamA' ? room.teamB : room.teamA;

  const batters = battingTeam.players || [];
  const fielders = fieldingTeam.players || [];

  const striker = room.cricketState?.crease?.striker;
  const nonStriker = room.cricketState?.crease?.nonStriker;

  const [wicketType, setWicketType] = useState<string>('bowled');
  const [dismissedId, setDismissedId] = useState<string | null>(striker?.id || null);
  const [fielderId, setFielderId] = useState<string | null>(null);
  const [newBatterId, setNewBatterId] = useState<string | null>(null);

  // Available next batters: squad players who haven't batted or aren't currently at crease
  const currentBatterIds = [striker?.id, nonStriker?.id].filter(Boolean);
  const availableBatters = batters.filter((p) => {
    // Check if player is already out
    const stat = room.cricketState?.batters?.[p.id];
    if (stat?.isOut) return false;
    // Check if player is currently in crease
    if (currentBatterIds.includes(p.id) && p.id !== dismissedId) return false;
    return true;
  });

  const handleQuickSkip = () => {
    onConfirm({
      wicketType: 'bowled',
      dismissedPlayerId: striker?.id || null,
      fielderId: null,
      newBatterId: null,
    });
  };

  const handleSave = () => {
    onConfirm({
      wicketType,
      dismissedPlayerId: dismissedId,
      fielderId: (wicketType === 'caught' || wicketType === 'run_out') ? fielderId : null,
      newBatterId: newBatterId || null,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 8, 0.82)',
        backdropFilter: 'blur(5px)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated, #16241C)',
          borderTop: '2px solid var(--status-live, #E85D4A)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          color: '#FFFFFF',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-live, #E85D4A)' }}>
              WICKET FALLEN!
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Record dismissal details or skip to proceed immediately
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '0.4rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Dismissal Type Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
            Dismissal Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
            {[
              { id: 'bowled', label: 'Bowled' },
              { id: 'caught', label: 'Caught' },
              { id: 'lbw', label: 'LBW' },
              { id: 'run_out', label: 'Run Out' },
              { id: 'stumped', label: 'Stumped' },
              { id: 'other', label: 'Other' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setWicketType(d.id)}
                style={{
                  padding: '0.6rem 0.25rem',
                  borderRadius: '6px',
                  border: wicketType === d.id ? '2px solid var(--status-live, #E85D4A)' : '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: wicketType === d.id ? 'rgba(232, 93, 74, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: wicketType === d.id ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                  fontWeight: wicketType === d.id ? 800 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* If Run Out: Choose who was out */}
        {wicketType === 'run_out' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
              Dismissed Batter
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDismissedId(striker?.id || 'striker')}
                style={{
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: dismissedId === (striker?.id || 'striker') ? '2px solid #E85D4A' : '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: dismissedId === (striker?.id || 'striker') ? 'rgba(232, 93, 74, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Striker {striker?.name ? `(${striker.name})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setDismissedId(nonStriker?.id || 'non_striker')}
                style={{
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: dismissedId === (nonStriker?.id || 'non_striker') ? '2px solid #E85D4A' : '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: dismissedId === (nonStriker?.id || 'non_striker') ? 'rgba(232, 93, 74, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Non-Striker {nonStriker?.name ? `(${nonStriker.name})` : ''}
              </button>
            </div>
          </div>
        )}

        {/* If Caught or Run Out: Optional Fielder */}
        {(wicketType === 'caught' || wicketType === 'run_out') && fielders.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
              Fielder ({fieldingTeam.name}) — Optional
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {fielders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFielderId(fielderId === f.id ? null : f.id)}
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: '999px',
                    border: fielderId === f.id ? '1.5px solid var(--accent-floodlight, #F2C94C)' : '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: fielderId === f.id ? 'rgba(242, 201, 76, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: fielderId === f.id ? 'var(--accent-floodlight, #F2C94C)' : 'rgba(255,255,255,0.8)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Who is coming in next? (If roster names available) */}
        {availableBatters.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
              Next Batter Coming In ({battingTeam.name}) — Optional
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {availableBatters.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setNewBatterId(newBatterId === b.id ? null : b.id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '999px',
                    border: newBatterId === b.id ? '1.5px solid #10B981' : '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: newBatterId === b.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: newBatterId === b.id ? '#10B981' : 'rgba(255,255,255,0.85)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleQuickSkip}
            style={{
              flex: 1,
              padding: '0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <SkipForward size={16} />
            <span>Skip Details</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 1.5,
              padding: '0.85rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--status-live, #E85D4A)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <Check size={18} />
            <span>Record Wicket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
