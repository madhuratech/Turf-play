import React, { useState } from 'react';
import type { MatchRoom, TeamKey } from '../types';
import { isSoundEnabled, setSoundEnabled } from '../lib/soundEffects';
import { ReactionOverlay } from './ReactionOverlay';
import { FootballClock } from './FootballClock';
import {
  Volume2,
  VolumeX,
  Share2,
  ArrowLeft,
  Circle,
  Radio,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface MatchCenterProps {
  room: MatchRoom;
  onBackToConsole?: () => void;
  isScorer?: boolean;
  onShareClick?: () => void;
  syncStatus?: 'live' | 'syncing' | 'offline';
}

export const MatchCenter: React.FC<MatchCenterProps> = ({
  room,
  onBackToConsole,
  isScorer = false,
  onShareClick,
  syncStatus = 'live',
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [copiedCode, setCopiedCode] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isCricket = room.sport === 'cricket';
  const isFootball = room.sport === 'football';

  const battingTeamKey: TeamKey = room.battingTeam || 'teamA';
  const battingTeam = battingTeamKey === 'teamA' ? room.teamA : room.teamB;
  const bowlingTeam = battingTeamKey === 'teamA' ? room.teamB : room.teamA;

  const cs = battingTeam.cricketScore;
  const cState = room.cricketState;
  const fState = room.footballState;

  // Toss info
  const tossText = room.tossWinner
    ? `${room[room.tossWinner].name} won toss & chose to ${room.tossChoice || 'play'}`
    : null;

  return (
    <div
      className="kc-match-center"
      style={{
        minHeight: '100vh',
        backgroundColor: '#F7F6F2',
        color: '#1A202C',
        fontFamily: '"Karla", -apple-system, BlinkMacSystemFont, sans-serif',
        paddingBottom: '4rem',
      }}
    >
      {/* Reaction Overlay for SIX, FOUR, WICKET, GOAL, etc. */}
      <ReactionOverlay
        lastEvent={room.lastEvent || null}
        scoringTeamColor={battingTeam.color || '#10B981'}
      />

      {/* TOP BROADCAST APP BAR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          padding: '0.65rem 1rem',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Back / Scorer Console Toggle & Match Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isScorer && onBackToConsole ? (
              <button
                onClick={onBackToConsole}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                <span>Scorer Console</span>
              </button>
            ) : null}

            {/* LIVE Broadcast Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: room.status === 'live' ? '#FEE2E2' : '#F1F5F9',
                color: room.status === 'live' ? '#DC2626' : '#64748B',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <Radio size={12} className={room.status === 'live' ? 'animate-pulse' : ''} />
              <span>{room.status === 'live' ? 'MATCH CENTER' : 'FINAL'}</span>
            </div>

            <span
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              {room.teamA.name} <span style={{ color: '#94A3B8' }}>vs</span> {room.teamB.name}
            </span>
          </div>

          {/* Right: Controls & Room Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Sync status chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                color: syncStatus === 'live' ? '#059669' : '#D97706',
                backgroundColor: syncStatus === 'live' ? '#ECFDF5' : '#FEF3C7',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              <Circle size={6} fill="currentColor" />
              <span>{syncStatus === 'live' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              title={soundOn ? 'Mute commentary sounds' : 'Enable synthesized commentary sounds'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: soundOn ? '#F8FAFC' : '#F1F5F9',
                color: soundOn ? '#0284C7' : '#94A3B8',
                cursor: 'pointer',
              }}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Room code & copy */}
            <button
              onClick={copyRoomCode}
              title="Click to copy room code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.08em',
              }}
            >
              <span>{copiedCode ? 'COPIED!' : room.code}</span>
            </button>

            {/* Share button */}
            {onShareClick && (
              <button
                onClick={onShareClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #0284C7',
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Share2 size={13} />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '960px', margin: '1.25rem auto', padding: '0 1rem' }}>
        {/* MATCH METADATA STRIP */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '0.85rem',
            fontSize: '0.82rem',
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {room.rules?.ruleSummary && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.15rem 0.5rem',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '4px',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                📋 {room.rules.ruleSummary}
              </span>
            )}
            {tossText && <span>🪙 {tossText}</span>}
          </div>

          {room.latestCommentary && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#0369A1',
                fontWeight: 500,
                fontStyle: 'italic',
              }}
            >
              <Sparkles size={14} color="#0284C7" />
              <span>{room.latestCommentary}</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            CRICKET BROADCAST SCORECARD
            ========================================================================= */}
        {isCricket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* HERO SCORE CARD */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {/* Batting vs Bowling header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: battingTeam.color || '#10B981',
                      display: 'inline-block',
                    }}
                  />
                  <h2
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '1.85rem',
                      fontWeight: 800,
                      margin: 0,
                      color: '#0F172A',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {battingTeam.name}
                  </h2>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Batting
                  </span>
                </div>

                {/* 1st Innings score summary if currently 2nd innings */}
                {cState?.innings === 2 && cState.firstInningsRuns != null && (
                  <div style={{ fontSize: '0.88rem', color: '#64748B' }}>
                    {bowlingTeam.name}:{' '}
                    <strong style={{ color: '#1E293B', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem' }}>
                      {cState.firstInningsRuns}/{cState.firstInningsWickets ?? 0}
                    </strong>
                  </div>
                )}
              </div>

              {/* Big Score & Overs Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.25rem',
                  alignItems: 'center',
                }}
              >
                {/* Massive Score Numerals */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
                  <span
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '4.5rem',
                      fontWeight: 900,
                      lineHeight: 0.9,
                      color: '#0F172A',
                    }}
                  >
                    {cs?.runs ?? 0}
                  </span>
                  <span
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '3.2rem',
                      fontWeight: 600,
                      lineHeight: 0.9,
                      color: '#94A3B8',
                      margin: '0 0.1rem',
                    }}
                  >
                    /
                  </span>
                  <span
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '3.6rem',
                      fontWeight: 800,
                      lineHeight: 0.9,
                      color: '#DC2626',
                    }}
                  >
                    {cs?.wickets ?? 0}
                  </span>
                </div>

                {/* Overs & Run Rates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                      Overs
                    </span>
                    <span
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: '#1E293B',
                      }}
                    >
                      {cState?.oversFormatted || '0.0'}
                      <span style={{ fontSize: '1.2rem', color: '#94A3B8', fontWeight: 600 }}>
                        {' '}/ {room.rules?.oversPerInnings || 20}
                      </span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>CRR: </span>
                      <strong style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.15rem', color: '#0F172A' }}>
                        {cState?.currentRunRate ?? 0}
                      </strong>
                    </div>

                    {cState?.innings === 2 && cState.requiredRunRate != null && (
                      <div>
                        <span style={{ color: '#64748B' }}>RRR: </span>
                        <strong
                          style={{
                            fontFamily: '"Barlow Condensed", sans-serif',
                            fontSize: '1.15rem',
                            color: '#D97706',
                          }}
                        >
                          {cState.requiredRunRate}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2nd Innings Target Chase Banner */}
              {cState?.innings === 2 && cState.target != null && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    padding: '0.65rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={18} color="#B45309" />
                    <span
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#92400E',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {cState.chaseText ||
                        `Need ${cState.runsNeeded ?? 0} runs from ${cState.ballsRemaining ?? 0} balls`}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#B45309', fontWeight: 600 }}>
                    Target: {cState.target}
                  </span>
                </div>
              )}

              {/* OVER BALLS STRIP: CURRENT OVER DOTS & RECENT BALLS */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #F1F5F9',
                }}
              >
                {/* Current Over Dots */}
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '0.4rem',
                    }}
                  >
                    This Over
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {(cState?.currentOverDots && cState.currentOverDots.length > 0) ? (
                      cState.currentOverDots.map((dot, idx) => {
                        const isWicket = dot.highlight === 'wicket' || dot.display === 'W';
                        const isSix = dot.highlight === 'six' || dot.display === '6';
                        const isFour = dot.highlight === 'four' || dot.display === '4';
                        const isExtra = dot.highlight === 'wide' || dot.highlight === 'no_ball' || !dot.isLegal;

                        let bg = '#F1F5F9';
                        let textCol = '#1E293B';
                        let borderCol = '#CBD5E1';

                        if (isWicket) {
                          bg = '#DC2626';
                          textCol = '#FFFFFF';
                          borderCol = '#B91C1C';
                        } else if (isSix) {
                          bg = '#7C3AED';
                          textCol = '#FFFFFF';
                          borderCol = '#6D28D9';
                        } else if (isFour) {
                          bg = '#2563EB';
                          textCol = '#FFFFFF';
                          borderCol = '#1D4ED8';
                        } else if (isExtra) {
                          bg = '#FEF3C7';
                          textCol = '#B45309';
                          borderCol = '#FCD34D';
                        }

                        return (
                          <div
                            key={dot.id || idx}
                            style={{
                              minWidth: '34px',
                              height: '34px',
                              padding: '0 0.4rem',
                              borderRadius: '999px',
                              backgroundColor: bg,
                              color: textCol,
                              border: `1.5px solid ${borderCol}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: '"Barlow Condensed", sans-serif',
                              fontSize: '1rem',
                              fontWeight: 800,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            }}
                          >
                            {dot.display}
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        Over starting...
                      </span>
                    )}
                  </div>
                </div>

                {/* Last 6 Balls Strip */}
                {cState?.last6Balls && cState.last6Balls.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#94A3B8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Recent Deliveries
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {cState.last6Balls.map((b, i) => (
                        <span
                          key={b.id || i}
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            fontFamily: '"Barlow Condensed", sans-serif',
                            padding: '0.15rem 0.45rem',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '4px',
                            border: '1px solid #E2E8F0',
                            color: b.highlight === 'wicket' ? '#DC2626' : b.highlight === 'six' ? '#7C3AED' : '#475569',
                          }}
                        >
                          {b.display}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* "ON THE CREASE" CARD (Only rendered when roster names exist) */}
            {cState?.crease?.hasNames && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#64748B',
                    marginBottom: '0.75rem',
                  }}
                >
                  On The Crease
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {/* Batters */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* Striker */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: '#059669', fontWeight: 800 }}>*</span>
                        <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>
                          {cState.crease.striker?.name || 'Striker'}
                        </strong>
                      </div>
                      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.15rem', fontWeight: 800 }}>
                        {cState.crease.striker ? (
                          <>
                            <span style={{ color: '#0F172A' }}>{cState.crease.striker.runs}</span>
                            <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
                              {' '}({cState.crease.striker.balls}b, {cState.crease.striker.fours}×4, {cState.crease.striker.sixes}×6)
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Not selected</span>
                        )}
                      </div>
                    </div>

                    {/* Non-Striker */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <strong style={{ fontSize: '0.95rem', color: '#475569' }}>
                        {cState.crease.nonStriker?.name || 'Non-Striker'}
                      </strong>
                      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.15rem', fontWeight: 800 }}>
                        {cState.crease.nonStriker ? (
                          <>
                            <span style={{ color: '#475569' }}>{cState.crease.nonStriker.runs}</span>
                            <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
                              {' '}({cState.crease.nonStriker.balls}b)
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Not selected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Current Bowler */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      padding: '0.75rem',
                      backgroundColor: '#F1F5F9',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Bowling ({bowlingTeam.name})
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.25rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>
                        {cState.crease.bowler?.name || 'Bowler'}
                      </strong>
                      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.3rem', fontWeight: 800, color: '#1E293B' }}>
                        {cState.crease.bowler ? (
                          <>
                            <span>{cState.crease.bowler.wickets} - {cState.crease.bowler.runs}</span>
                            <span style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 600 }}>
                              {' '}({cState.crease.bowler.oversFormatted} ov)
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Not set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            FOOTBALL BROADCAST SCORECARD
            ========================================================================= */}
        {isFootball && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* HERO FOOTBALL SCORECARD */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
              }}
            >
              {/* Scoreline */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Team A */}
                <div style={{ flex: 1, minWidth: '130px', textAlign: 'right' }}>
                  <h2
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '2rem',
                      fontWeight: 800,
                      margin: 0,
                      color: '#0F172A',
                      textTransform: 'uppercase',
                    }}
                  >
                    {room.teamA.name}
                  </h2>
                </div>

                {/* Numerals */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#0F172A',
                  }}
                >
                  <span>{room.teamA.footballScore?.goals ?? 0}</span>
                  <span style={{ color: '#CBD5E1' }}>-</span>
                  <span>{room.teamB.footballScore?.goals ?? 0}</span>
                </div>

                {/* Team B */}
                <div style={{ flex: 1, minWidth: '130px', textAlign: 'left' }}>
                  <h2
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '2rem',
                      fontWeight: 800,
                      margin: 0,
                      color: '#0F172A',
                      textTransform: 'uppercase',
                    }}
                  >
                    {room.teamB.name}
                  </h2>
                </div>
              </div>

              {/* Match Clock */}
              {fState && (
                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                  <FootballClock
                    clockRunning={fState.clockRunning}
                    clockAccumulatedMs={fState.clockAccumulatedMs}
                    clockLastStartedAt={fState.clockLastStartedAt}
                    currentHalf={fState.currentHalf}
                    halfMinutes={room.rules?.halfMinutes || 45}
                    isExtraTime={room.phase === 'extra_time'}
                  />
                </div>
              )}
            </div>

            {/* GOALS TIMELINE */}
            {fState?.goalsTimeline && fState.goalsTimeline.length > 0 && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#64748B',
                    marginBottom: '0.75rem',
                  }}
                >
                  Goals Timeline
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {fState.goalsTimeline.map((item, idx) => {
                    const isTeamA = item.team === 'teamA';
                    const teamName = isTeamA ? room.teamA.name : room.teamB.name;
                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.9rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span
                            style={{
                              fontFamily: '"Barlow Condensed", sans-serif',
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              color: '#0284C7',
                              minWidth: '32px',
                            }}
                          >
                            {item.minute}'
                          </span>
                          <span style={{ fontSize: '1.1rem' }}>⚽</span>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>
                            {item.scorerName || 'Goal'}
                          </span>
                          {item.goalType === 'penalty' && (
                            <span style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600 }}>
                              (Pen)
                            </span>
                          )}
                          {item.goalType === 'own_goal' && (
                            <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                              (OG)
                            </span>
                          )}
                          {item.assistName && (
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                              assist: {item.assistName}
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            backgroundColor: '#E2E8F0',
                            borderRadius: '4px',
                            color: '#334155',
                          }}
                        >
                          {teamName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            LIVE COMMENTARY FEED
            ========================================================================= */}
        <div
          style={{
            marginTop: '1.25rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.85rem',
            }}
          >
            <h3
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '0.02em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Ball-by-Ball Commentary
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              {(room.commentary || []).length} entries
            </span>
          </div>

          {(!room.commentary || room.commentary.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.9rem' }}>
              Ball-by-ball updates and key moments will stream here live.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
              {room.commentary.map((c, i) => {
                const isHighlight =
                  c.kind === 'six' ||
                  c.kind === 'four' ||
                  c.kind === 'wicket' ||
                  c.kind === 'goal' ||
                  c.kind === 'penalty';

                return (
                  <div
                    key={c.id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: i === 0 ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid',
                      borderColor: i === 0 ? '#CBD5E1' : '#F1F5F9',
                      borderRadius: '8px',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        minWidth: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor:
                          c.kind === 'six'
                            ? '#7C3AED'
                            : c.kind === 'wicket'
                            ? '#DC2626'
                            : c.kind === 'goal'
                            ? '#059669'
                            : c.kind === 'four'
                            ? '#2563EB'
                            : '#94A3B8',
                        marginTop: '0.45rem',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.92rem',
                          fontWeight: isHighlight ? 700 : 500,
                          color: isHighlight ? '#0F172A' : '#334155',
                          lineHeight: 1.4,
                        }}
                      >
                        {c.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
