import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import type { SportType, TeamKey, MatchRoom, MatchRulesInput } from '../types';
import { createRoom, claimTeam } from '../lib/roomService';
import { getDeviceId } from '../lib/device';
import { ArrowLeft, Check, Sparkles, Trophy, Sliders, Shield } from 'lucide-react';

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard step: 1 = Teams & Sport, 2 = Match Rules
  const [step, setStep] = useState<1 | 2>(1);

  const [sport, setSport] = useState<SportType>('cricket');
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');

  // Cricket Rules State
  const [cricketOversPreset, setCricketOversPreset] = useState<number | 'custom'>(5);
  const [cricketCustomOvers, setCricketCustomOvers] = useState<number>(5);
  const [cricketPlayers, setCricketPlayers] = useState<number>(11);
  const [cricketWideNoBallRerun, setCricketWideNoBallRerun] = useState<boolean>(true);

  // Football Rules State
  const [footballHalfPreset, setFootballHalfPreset] = useState<number | 'custom'>(15);
  const [footballCustomHalf, setFootballCustomHalf] = useState<number>(15);
  const [footballHalves, setFootballHalves] = useState<number>(2);
  const [footballPlayers, setFootballPlayers] = useState<number>(11);
  const [footballDrawRule, setFootballDrawRule] = useState<'draw' | 'golden_goal' | 'shootout'>('draw');
  const [footballMercyEnabled, setFootballMercyEnabled] = useState<boolean>(false);
  const [footballMercyLead, setFootballMercyLead] = useState<number>(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Post-creation prompt state
  const [createdRoom, setCreatedRoom] = useState<MatchRoom | null>(null);

  // Computed values
  const effectiveOvers = cricketOversPreset === 'custom' ? cricketCustomOvers : cricketOversPreset;
  const effectiveHalfMinutes = footballHalfPreset === 'custom' ? footballCustomHalf : footballHalfPreset;

  // Real-time summary calculation
  const getRuleSummaryPreview = (): string => {
    if (sport === 'cricket') {
      const style =
        effectiveOvers <= 5
          ? 'Blitz'
          : effectiveOvers <= 10
          ? 'Box Cricket'
          : 'T20-style';
      return `${style} · ${effectiveOvers} overs · ${cricketPlayers} players`;
    } else {
      const drawLabel =
        footballDrawRule === 'golden_goal'
          ? 'golden goal'
          : footballDrawRule === 'shootout'
          ? 'penalty shootout'
          : 'draw';
      return `${footballHalves} × ${effectiveHalfMinutes} min · ${footballPlayers}-a-side · ${drawLabel}${
        footballMercyEnabled ? ` · Mercy lead: ${footballMercyLead}` : ''
      }`;
    }
  };

  const handleProceedToRules = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    const finalTeamA = teamAName.trim() || (sport === 'cricket' ? 'Strikers XI' : 'Red Wolves FC');
    const finalTeamB = teamBName.trim() || (sport === 'cricket' ? 'Pitch Masters' : 'Royal Knights FC');

    setLoading(true);
    setError('');

    const rulesPayload: MatchRulesInput =
      sport === 'cricket'
        ? {
            oversPerInnings: effectiveOvers,
            playersPerSide: cricketPlayers,
            wideNoBallRerun: cricketWideNoBallRerun,
          }
        : {
            halfMinutes: effectiveHalfMinutes,
            halves: footballHalves,
            playersPerSide: footballPlayers,
            drawRule: footballDrawRule,
            mercyGoalLead: footballMercyEnabled ? footballMercyLead : null,
          };

    try {
      const hostId = getDeviceId();
      const room = await createRoom({
        sport,
        teamAName: finalTeamA,
        teamBName: finalTeamB,
        hostDeviceId: hostId,
        rules: rulesPayload,
      });
      setCreatedRoom(room);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAndProceed = async (team: TeamKey | null) => {
    if (!createdRoom) return;

    if (team) {
      const deviceId = getDeviceId();
      await claimTeam(createdRoom.code, team, deviceId);
    }
    navigate(`/room/${createdRoom.code}`);
  };

  const roomJoinUrl = createdRoom
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/room/${createdRoom.code}`
      : `/room/${createdRoom.code}`
    : '';

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3.5rem', maxWidth: '640px' }}>
      <button
        onClick={() => {
          if (step === 2) setStep(1);
          else navigate(-1);
        }}
        className="btn btn-outline btn-sm"
        style={{ marginBottom: '1.5rem', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} />
        {step === 2 ? 'Back to Team Setup' : 'Back'}
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
        {/* Step Indicator Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-amber">
              Step {step} of 2: {step === 1 ? 'Teams & Sport' : 'Match Rules'}
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', marginTop: '0.25rem' }}>
            {step === 1 ? 'Create Score Room' : 'Configure Match Rules'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {step === 1
              ? 'Set your sport and team names. Private 6-char room code generated upon setup.'
              : 'Server-enforced match rules. Rules lock once coin toss is flipped.'}
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
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 1: SPORT & TEAMS */}
        {step === 1 && (
          <form onSubmit={handleProceedToRules} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Sport Selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-scoreboard)',
                  fontSize: '1.05rem',
                  letterSpacing: '0.04em',
                  marginBottom: '0.6rem',
                  textTransform: 'uppercase',
                }}
              >
                Select Sport
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSport('cricket')}
                  style={{
                    padding: '1.1rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: sport === 'cricket' ? 'var(--bg-surface-active)' : 'var(--bg-primary)',
                    border: sport === 'cricket' ? '2px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'border-color var(--transition-fast)',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(242, 201, 76, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-floodlight)',
                      fontSize: '1.2rem',
                    }}
                  >
                    🏏
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.2rem', fontWeight: 800 }}>
                      CRICKET
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Overs, Wickets, Chase &amp; Run Rate
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSport('football')}
                  style={{
                    padding: '1.1rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: sport === 'football' ? 'var(--bg-surface-active)' : 'var(--bg-primary)',
                    border: sport === 'football' ? '2px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'border-color var(--transition-fast)',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(242, 201, 76, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-floodlight)',
                      fontSize: '1.2rem',
                    }}
                  >
                    ⚽
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.2rem', fontWeight: 800 }}>
                      FOOTBALL
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Halves, Server Clock, Golden Goal
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Team Names */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="teamA"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-scoreboard)',
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    marginBottom: '0.4rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Team A Name
                </label>
                <input
                  id="teamA"
                  type="text"
                  placeholder={sport === 'cricket' ? 'e.g. Strikers XI' : 'e.g. Red Wolves FC'}
                  value={teamAName}
                  onChange={e => setTeamAName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-scoreboard)',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  justifyContent: 'center',
                  color: 'var(--accent-floodlight)',
                  fontFamily: 'var(--font-scoreboard)',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                }}
              >
                <span style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-subtle)' }} />
                VS
                <span style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-subtle)' }} />
              </div>

              <div>
                <label
                  htmlFor="teamB"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-scoreboard)',
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    marginBottom: '0.4rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Team B Name
                </label>
                <input
                  id="teamB"
                  type="text"
                  placeholder={sport === 'cricket' ? 'e.g. Pitch Masters' : 'e.g. Royal Knights FC'}
                  value={teamBName}
                  onChange={e => setTeamBName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-scoreboard)',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ marginTop: '0.5rem', width: '100%' }}
            >
              Continue to Match Rules →
            </button>
          </form>
        )}

        {/* STEP 2: MATCH RULES */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Live Rule Summary Card */}
            <div
              style={{
                backgroundColor: 'rgba(242, 201, 76, 0.08)',
                border: '1px solid var(--accent-floodlight)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Sliders size={20} color="var(--accent-floodlight)" />
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-floodlight)', fontWeight: 700 }}>
                  Match Rules Summary
                </div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.15rem', color: '#FFFFFF', marginTop: '0.1rem' }}>
                  {getRuleSummaryPreview()}
                </div>
              </div>
            </div>

            {/* CRICKET RULES CONFIGURATION */}
            {sport === 'cricket' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Overs per innings */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1rem', textTransform: 'uppercase' }}>
                      Overs per Innings
                    </label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-floodlight)', fontWeight: 700 }}>
                      {effectiveOvers} {effectiveOvers === 1 ? 'Over' : 'Overs'} ({effectiveOvers * 6} legal balls)
                    </span>
                  </div>

                  {/* Preset chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.6rem' }}>
                    {[2, 5, 6, 8, 10, 15, 20].map((ov) => (
                      <button
                        key={ov}
                        type="button"
                        onClick={() => setCricketOversPreset(ov)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '20px',
                          border: cricketOversPreset === ov ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                          backgroundColor: cricketOversPreset === ov ? 'var(--accent-floodlight)' : 'var(--bg-primary)',
                          color: cricketOversPreset === ov ? '#000000' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {ov} ov
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCricketOversPreset('custom')}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '20px',
                        border: cricketOversPreset === 'custom' ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                        backgroundColor: cricketOversPreset === 'custom' ? 'var(--accent-floodlight)' : 'var(--bg-primary)',
                        color: cricketOversPreset === 'custom' ? '#000000' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      Custom
                    </button>
                  </div>

                  {cricketOversPreset === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={cricketCustomOvers}
                        onChange={(e) => setCricketCustomOvers(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                        style={{
                          width: '100px',
                          padding: '0.6rem 0.8rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '1rem',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Overs (1–50)
                      </span>
                    </div>
                  )}
                </div>

                {/* Players per side */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1rem', textTransform: 'uppercase' }}>
                      Players per Side
                    </label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Max wickets: <strong style={{ color: 'var(--accent-floodlight)' }}>{cricketPlayers - 1}</strong> (all out)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {[5, 6, 7, 8, 9, 10, 11].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCricketPlayers(p)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '20px',
                          border: cricketPlayers === p ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                          backgroundColor: cricketPlayers === p ? 'var(--accent-floodlight)' : 'var(--bg-primary)',
                          color: cricketPlayers === p ? '#000000' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        {p} players
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wide and No-Ball rule toggle */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      Wide &amp; No-ball adds 1 run and re-bowled
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Adds +1 penalty run and does not consume a legal ball
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCricketWideNoBallRerun(!cricketWideNoBallRerun)}
                    style={{
                      width: '48px',
                      height: '26px',
                      borderRadius: '13px',
                      backgroundColor: cricketWideNoBallRerun ? 'var(--accent-floodlight)' : '#333333',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        position: 'absolute',
                        top: '3px',
                        left: cricketWideNoBallRerun ? '25px' : '3px',
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                </div>

                {/* Fixed balls per over pill */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Shield size={14} /> Balls per over fixed at 6 legal deliveries.
                </div>
              </div>
            )}

            {/* FOOTBALL RULES CONFIGURATION */}
            {sport === 'football' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Half length */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1rem', textTransform: 'uppercase' }}>
                      Half Length (Minutes)
                    </label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-floodlight)', fontWeight: 700 }}>
                      {effectiveHalfMinutes} min per half
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.6rem' }}>
                    {[1, 10, 15, 20, 25, 30, 45].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFootballHalfPreset(m)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '20px',
                          border: footballHalfPreset === m ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                          backgroundColor: footballHalfPreset === m ? 'var(--accent-floodlight)' : 'var(--bg-primary)',
                          color: footballHalfPreset === m ? '#000000' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        {m === 1 ? '1 min (Test)' : `${m} min`}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFootballHalfPreset('custom')}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '20px',
                        border: footballHalfPreset === 'custom' ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                        backgroundColor: footballHalfPreset === 'custom' ? 'var(--accent-floodlight)' : 'var(--bg-primary)',
                        color: footballHalfPreset === 'custom' ? '#000000' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      Custom
                    </button>
                  </div>

                  {footballHalfPreset === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={footballCustomHalf}
                        onChange={(e) => setFootballCustomHalf(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                        style={{
                          width: '100px',
                          padding: '0.6rem 0.8rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '1rem',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Minutes (1–90)
                      </span>
                    </div>
                  )}
                </div>

                {/* Halves count */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1rem', textTransform: 'uppercase' }}>
                      Halves
                    </label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Half-time break is manual (no countdown)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setFootballHalves(h)}
                        style={{
                          flex: 1,
                          padding: '0.65rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          border: footballHalves === h ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                          backgroundColor: footballHalves === h ? 'var(--bg-surface-active)' : 'var(--bg-primary)',
                          color: footballHalves === h ? 'var(--accent-floodlight)' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                        }}
                      >
                        {h === 1 ? '1 Single Half' : '2 Halves (Standard)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Players per side */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-scoreboard)', fontSize: '1rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Players per Side (Informational)
                  </label>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {[5, 6, 7, 9, 11].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFootballPlayers(p)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '20px',
                          border: footballPlayers === p ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                          backgroundColor: footballPlayers === p ? 'var(--accent-floodlight)' : 'var(--bg-primary)',
                          color: footballPlayers === p ? '#000000' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        {p}-a-side
                      </button>
                    ))}
                  </div>
                </div>

                {/* If Match is Level at Full Time (Draw Rule) */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-scoreboard)', fontSize: '1rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    If Match is Level at Full Time
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                    {[
                      { id: 'draw', label: 'Draw', desc: 'Ends in level score' },
                      { id: 'golden_goal', label: 'Golden Goal', desc: 'Extra 5 min, first goal wins' },
                      { id: 'shootout', label: 'Penalty Shootout', desc: 'Shootout goal tally' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFootballDrawRule(item.id as any)}
                        style={{
                          padding: '0.75rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: footballDrawRule === item.id ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                          backgroundColor: footballDrawRule === item.id ? 'var(--bg-surface-active)' : 'var(--bg-primary)',
                          color: footballDrawRule === item.id ? 'var(--accent-floodlight)' : 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Mercy Rule */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: footballMercyEnabled ? '0.75rem' : '0' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Mercy Rule (Goal Lead Auto-End)
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Match automatically ends if a team leads by N goals
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFootballMercyEnabled(!footballMercyEnabled)}
                      style={{
                        width: '48px',
                        height: '26px',
                        borderRadius: '13px',
                        backgroundColor: footballMercyEnabled ? 'var(--accent-floodlight)' : '#333333',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          position: 'absolute',
                          top: '3px',
                          left: footballMercyEnabled ? '25px' : '3px',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  </div>

                  {footballMercyEnabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>End match if lead reaches:</span>
                      {[3, 5, 7, 10].map((lead) => (
                        <button
                          key={lead}
                          type="button"
                          onClick={() => setFootballMercyLead(lead)}
                          style={{
                            padding: '0.35rem 0.7rem',
                            borderRadius: '16px',
                            border: footballMercyLead === lead ? '1.5px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                            backgroundColor: footballMercyLead === lead ? 'var(--accent-floodlight)' : 'transparent',
                            color: footballMercyLead === lead ? '#000000' : 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          +{lead} goals
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Back to Teams
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
              >
                {loading ? 'Creating Match Room...' : 'Create Match & Generate Code'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Immediate Post-Creation Claim Prompt Modal */}
      {createdRoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-prompt-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 12, 8, 0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1.5px solid var(--accent-floodlight)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              boxShadow: 'var(--shadow-scoreboard)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(242, 201, 76, 0.2)',
                color: 'var(--accent-floodlight)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Sparkles size={24} />
            </div>

            <span className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
              Match Created Successfully
            </span>

            <h2 id="claim-prompt-title" style={{ fontSize: '1.8rem', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
              Which team are you scoring for?
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Each team can be claimed by exactly one device. Select your team to activate scoring controls for this device.
            </p>

            {/* Room Code & QR Display */}
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-block',
                }}
              >
                {createdRoom.qrImageBase64 ? (
                  <img
                    src={createdRoom.qrImageBase64}
                    alt={`QR Code for Room ${createdRoom.code}`}
                    width={130}
                    height={130}
                    style={{ display: 'block', borderRadius: '4px' }}
                  />
                ) : (
                  <QRCodeSVG value={roomJoinUrl} size={130} level="M" />
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Match Room Code
                </span>
                <div
                  style={{
                    fontFamily: 'var(--font-scoreboard)',
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: 'var(--accent-floodlight)',
                    letterSpacing: '0.15em',
                  }}
                >
                  {createdRoom.code}
                </div>
              </div>

              {createdRoom.rules?.ruleSummary && (
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-floodlight)', fontFamily: 'var(--font-scoreboard)' }}>
                  {createdRoom.rules.ruleSummary}
                </div>
              )}
            </div>

            {/* Team Claim Selection Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleClaimAndProceed('teamA')}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'space-between', padding: '0.9rem 1.25rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} />
                  <span>Score for <strong>{createdRoom.teamA.name}</strong></span>
                </div>
                <Check size={18} />
              </button>

              <button
                onClick={() => handleClaimAndProceed('teamB')}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'space-between', padding: '0.9rem 1.25rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} />
                  <span>Score for <strong>{createdRoom.teamB.name}</strong></span>
                </div>
                <Check size={18} />
              </button>

              <button
                onClick={() => handleClaimAndProceed(null)}
                className="btn btn-surface"
                style={{ width: '100%', marginTop: '0.35rem' }}
              >
                Neither (Enter as Spectator / View Only)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
