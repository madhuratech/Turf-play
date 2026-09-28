import React, { useState, useEffect } from 'react';
import type { MatchRoom, TeamKey } from '../types';
import { updatePlayers } from '../lib/roomService';
import { Users, Plus, Trash2, ArrowUp, ArrowDown, X, Lock, Check } from 'lucide-react';

interface SquadSheetProps {
  room: MatchRoom;
  team: TeamKey;
  deviceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedRoom: MatchRoom) => void;
}

export const SquadSheet: React.FC<SquadSheetProps> = ({
  room,
  team,
  deviceId,
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!isOpen) return null;

  const targetTeamObj = team === 'teamA' ? room.teamA : room.teamB;
  const isFinished = room.phase === 'finished';
  const claimToken = team === 'teamA' ? room.claims.teamA : room.claims.teamB;
  const isScorer = claimToken === deviceId;
  const maxPlayers = room.rules?.playersPerSide || 11;

  const initialNames = (targetTeamObj.players || []).map((p) => p.name);
  const [names, setNames] = useState<string[]>(initialNames);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNames((targetTeamObj.players || []).map((p) => p.name));
  }, [targetTeamObj.players]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (names.length >= maxPlayers) {
      setError(`Maximum ${maxPlayers} players allowed per team.`);
      return;
    }
    const trimmed = newName.trim().slice(0, 20);
    if (names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already in the squad.`);
      return;
    }
    setError(null);
    setNames([...names, trimmed]);
    setNewName('');
  };

  const handleRemove = (index: number) => {
    setError(null);
    setNames(names.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= names.length) return;
    const next = [...names];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setNames(next);
  };

  const handleSave = async () => {
    if (!isScorer) return;
    setSaving(true);
    setError(null);

    const res = await updatePlayers(room.code, deviceId, team, names);
    setSaving(false);

    if (!res.success) {
      setError(res.error || 'Failed to save squad');
    } else {
      if (res.room && onSaved) onSaved(res.room);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#1E232A',
          color: '#F8FAFC',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                {targetTeamObj.name} Squad
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                {names.length} of {maxPlayers} slots filled
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.5rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {isFinished && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <Lock size={16} />
              Rosters lock once the match is finished.
            </div>
          )}

          {!isScorer && (
            <div
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                color: '#FACC15',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              Viewing only. Only {targetTeamObj.name} scorer can edit this squad.
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#F87171',
                padding: '0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Add input */}
          {isScorer && !isFinished && names.length < maxPlayers && (
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                type="text"
                placeholder={`Add player name (e.g. Player ${names.length + 1})`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={20}
                style={{
                  flex: 1,
                  backgroundColor: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: '#F8FAFC',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#3B82F6',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                <Plus size={16} /> Add
              </button>
            </form>
          )}

          {/* Player list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: maxPlayers }).map((_, idx) => {
              const name = names[idx];
              const isFilled = Boolean(name);

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: isFilled ? '#0F172A' : 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isFilled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    color: isFilled ? '#F8FAFC' : '#64748B',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isFilled ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                        color: isFilled ? '#60A5FA' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: isFilled ? 500 : 400 }}>
                      {isFilled ? name : `Player ${idx + 1} (unnamed)`}
                    </span>
                  </div>

                  {isScorer && !isFinished && isFilled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: idx === 0 ? '#475569' : '#94A3B8',
                          cursor: idx === 0 ? 'default' : 'pointer',
                          padding: '0.25rem',
                        }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === names.length - 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: idx === names.length - 1 ? '#475569' : '#94A3B8',
                          cursor: idx === names.length - 1 ? 'default' : 'pointer',
                          padding: '0.25rem',
                        }}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        onClick={() => handleRemove(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          marginLeft: '0.25rem',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {isScorer && !isFinished && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94A3B8',
                borderRadius: '8px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: '#10B981',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.5rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Check size={16} /> {saving ? 'Saving...' : 'Save Squad'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
