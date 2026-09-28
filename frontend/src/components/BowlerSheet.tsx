import React, { useState } from 'react';
import type { MatchRoom, TeamKey } from '../types';
import { X, AlertCircle } from 'lucide-react';

interface BowlerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  room: MatchRoom;
  fieldingTeamKey: TeamKey;
  onSelectBowler: (bowlerId: string) => void;
}

export const BowlerSheet: React.FC<BowlerSheetProps> = ({
  isOpen,
  onClose,
  room,
  fieldingTeamKey,
  onSelectBowler,
}) => {
  if (!isOpen) return null;

  const fieldingTeam = fieldingTeamKey === 'teamA' ? room.teamA : room.teamB;
  const players = fieldingTeam.players || [];
  const currentBowlerId = room.cricketState?.crease?.currentBowlerId || room.cricketState?.crease?.bowler?.id;

  // In cricket, consecutive overs by the same bowler are not allowed
  // If the bowler currently finished an over, they cannot bowl the immediate next over
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedId) {
      setError('Please select a bowler from the squad.');
      return;
    }

    if (selectedId === currentBowlerId && room.cricketState?.currentOverDots?.length === 0) {
      setError('Consecutive overs by the same bowler are not permitted.');
      return;
    }

    onSelectBowler(selectedId);
    onClose();
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated, #16241C)',
          border: '1.5px solid var(--accent-floodlight, #F2C94C)',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
              Select Bowler
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              {fieldingTeam.name} (Fielding)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '0.35rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(232, 93, 74, 0.15)',
              border: '1px solid var(--status-live, #E85D4A)',
              borderRadius: '6px',
              color: '#FF8A7A',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {players.length === 0 ? (
          <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
            No squad players added yet. Add players in "Edit Squad" to assign bowler figures.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '1.25rem' }}>
            {players.map((p) => {
              const isPreviousBowler = p.id === currentBowlerId && room.cricketState?.currentOverDots?.length === 0;
              const isSelected = selectedId === p.id;
              const stats = room.cricketState?.bowlers?.[p.id];

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isPreviousBowler}
                  onClick={() => {
                    setError(null);
                    setSelectedId(p.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: isSelected
                      ? '1.5px solid var(--accent-floodlight, #F2C94C)'
                      : isPreviousBowler
                      ? '1px dashed rgba(255,255,255,0.15)'
                      : '1px solid rgba(255,255,255,0.12)',
                    backgroundColor: isSelected
                      ? 'rgba(242, 201, 76, 0.15)'
                      : isPreviousBowler
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.05)',
                    color: isPreviousBowler ? 'rgba(255,255,255,0.35)' : '#FFFFFF',
                    cursor: isPreviousBowler ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      {p.name}
                      {isPreviousBowler && (
                        <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: '#F87171' }}>
                          (Bowled last over)
                        </span>
                      )}
                    </div>
                  </div>

                  {stats && (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                      {stats.wickets}-{stats.runs} ({stats.oversFormatted} ov)
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-surface"
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{ flex: 1.5, padding: '0.75rem' }}
          >
            Set Bowler
          </button>
        </div>
      </div>
    </div>
  );
};
