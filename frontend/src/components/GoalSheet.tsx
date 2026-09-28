import React, { useState } from 'react';
import type { MatchRoom, TeamKey } from '../types';
import { X, Check, SkipForward } from 'lucide-react';

interface GoalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  room: MatchRoom;
  scoringTeamKey: TeamKey;
  onConfirm: (data: {
    scorerId?: string | null;
    assistId?: string | null;
    goalType?: 'goal' | 'penalty' | 'own_goal';
  }) => void;
}

export const GoalSheet: React.FC<GoalSheetProps> = ({
  isOpen,
  onClose,
  room,
  scoringTeamKey,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const scoringTeam = scoringTeamKey === 'teamA' ? room.teamA : room.teamB;
  const defendingTeam = scoringTeamKey === 'teamA' ? room.teamB : room.teamA;

  const [goalType, setGoalType] = useState<'goal' | 'penalty' | 'own_goal'>('goal');
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);

  const squadPlayers = goalType === 'own_goal' ? (defendingTeam.players || []) : (scoringTeam.players || []);

  const handleQuickSkip = () => {
    onConfirm({
      goalType: 'goal',
      scorerId: null,
      assistId: null,
    });
  };

  const handleSave = () => {
    onConfirm({
      goalType,
      scorerId,
      assistId: goalType === 'goal' ? assistId : null,
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
          borderTop: '2px solid var(--accent-floodlight, #F2C94C)',
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
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-floodlight, #F2C94C)' }}>
              ⚽ GOAL SCORED!
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              for {scoringTeam.name}
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

        {/* Goal Type Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
            Goal Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
            {[
              { id: 'goal' as const, label: '⚽ Regular Goal' },
              { id: 'penalty' as const, label: '🎯 Penalty' },
              { id: 'own_goal' as const, label: '🤦 Own Goal' },
            ].map((gt) => (
              <button
                key={gt.id}
                type="button"
                onClick={() => {
                  setGoalType(gt.id);
                  setScorerId(null);
                  setAssistId(null);
                }}
                style={{
                  padding: '0.65rem 0.25rem',
                  borderRadius: '6px',
                  border: goalType === gt.id ? '2px solid var(--accent-floodlight, #F2C94C)' : '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: goalType === gt.id ? 'rgba(242, 201, 76, 0.18)' : 'rgba(255,255,255,0.05)',
                  color: goalType === gt.id ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                  fontWeight: goalType === gt.id ? 800 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {gt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scorer Picker (If squad players exist) */}
        {squadPlayers.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
              {goalType === 'own_goal' ? `Own Goal Scorer (${defendingTeam.name})` : `Goal Scorer (${scoringTeam.name})`}
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {squadPlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setScorerId(scorerId === p.id ? null : p.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    border: scorerId === p.id ? '1.5px solid var(--accent-floodlight, #F2C94C)' : '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: scorerId === p.id ? 'rgba(242, 201, 76, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: scorerId === p.id ? 'var(--accent-floodlight, #F2C94C)' : 'rgba(255,255,255,0.85)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Assist Picker (If regular goal and squad players exist) */}
        {goalType === 'goal' && (scoringTeam.players || []).length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
              Assist ({scoringTeam.name}) — Optional
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(scoringTeam.players || [])
                .filter((p) => p.id !== scorerId)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAssistId(assistId === p.id ? null : p.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      border: assistId === p.id ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.15)',
                      backgroundColor: assistId === p.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: assistId === p.id ? '#38BDF8' : 'rgba(255,255,255,0.85)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {p.name}
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
              backgroundColor: 'var(--accent-floodlight, #F2C94C)',
              color: '#0F1A14',
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
            <span>Record Goal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
