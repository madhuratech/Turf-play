import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { MatchRoom, TeamKey } from '../types';
import {
  getRoom,
  subscribeToRoom,
  claimTeam,
  releaseTeamClaim,
  resetScorer,
  submitBallScore,
  submitGoal,
  submitScoreEvent,
  undoLastScoreEvent,
  updateCrease,
  declareInnings,
  updateFootballClock,
  endMatchEarly,
} from '../lib/roomService';
import type { ScoreAction, ClockAction } from '../lib/roomService';
import { getDeviceId } from '../lib/device';
import { subscribeSyncStatus, type SyncStatus } from '../lib/outbox';

// Components
import { MatchCenter } from '../components/MatchCenter';
import { SquadSheet } from '../components/SquadSheet';
import { WicketSheet } from '../components/WicketSheet';
import { GoalSheet } from '../components/GoalSheet';
import { BowlerSheet } from '../components/BowlerSheet';
import { ReactionOverlay } from '../components/ReactionOverlay';
import { LiveIndicator } from '../components/LiveIndicator';
import { ScoreDigit } from '../components/ScoreDigit';
import { ShareModal } from '../components/ShareModal';
import { WaitingScreen } from '../components/WaitingScreen';
import { CoinTossScreen } from '../components/CoinTossScreen';
import { TossChoiceScreen } from '../components/TossChoiceScreen';
import { InningsBreakScreen } from '../components/InningsBreakScreen';
import { HalfTimeScreen } from '../components/HalfTimeScreen';
import { ShootoutScreen } from '../components/ShootoutScreen';
import { ResultScreen } from '../components/ResultScreen';
import { CricketOverDots } from '../components/CricketOverDots';
import { FootballClock } from '../components/FootballClock';

// Icons
import {
  QrCode,
  RotateCcw,
  Eye,
  Unlock,
  AlertCircle,
  ArrowLeft,
  Shield,
  Play,
  Pause,
  StopCircle,
  Flag,
  Users,
  Vibrate,
  Circle,
  Radio,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';

export const ScoreboardPage: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<MatchRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState(getDeviceId());

  // View mode: 'console' (scorer) vs 'viewer' (broadcast Match Center)
  const [viewMode, setViewMode] = useState<'console' | 'viewer' | null>(null);

  // Network sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('live');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Haptics setting
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('kc_haptics') !== 'false' : true;
  });

  // Undo confirmation toast
  const [undoToast, setUndoToast] = useState<{ message: string; timestamp: number } | null>(null);

  // Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [endingMatch, setEndingMatch] = useState(false);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [squadModalTeam, setSquadModalTeam] = useState<TeamKey | null>(null);
  const [showResetScorerModal, setShowResetScorerModal] = useState(false);

  // Sheets for ball/goal details
  const [showWicketSheet, setShowWicketSheet] = useState(false);
  const [goalSheetData, setGoalSheetData] = useState<{ isOpen: boolean; team: TeamKey } | null>(null);
  const [showBowlerSheet, setShowBowlerSheet] = useState(false);

  // Inline Extras Stepper state (Cricket)
  const [activeExtraType, setActiveExtraType] = useState<'wide' | 'no_ball' | 'bye' | 'leg_bye' | null>(null);
  const [extraAdditionalRuns, setExtraAdditionalRuns] = useState<number>(0);

  // Action status / feedback
  const [actionError, setActionError] = useState<string | null>(null);

  // Haptic feedback trigger
  const triggerHaptic = (pattern: 'tap' | 'boundary' | 'wicket' | 'goal') => {
    if (!hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      if (pattern === 'tap') navigator.vibrate(15);
      else if (pattern === 'boundary') navigator.vibrate([30, 40, 30]);
      else if (pattern === 'wicket') navigator.vibrate([60, 50, 60]);
      else if (pattern === 'goal') navigator.vibrate([50, 40, 50, 40, 100]);
    } catch {
      // Ignore vibration errors
    }
  };

  const toggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    localStorage.setItem('kc_haptics', next ? 'true' : 'false');
    if (next) triggerHaptic('tap');
  };

  // Sync deviceId changes if switched in Navbar simulator
  useEffect(() => {
    const handleDeviceChange = (e: any) => {
      if (e.detail?.deviceId) {
        setDeviceId(e.detail.deviceId);
      }
    };
    window.addEventListener('kc_device_changed', handleDeviceChange);
    return () => window.removeEventListener('kc_device_changed', handleDeviceChange);
  }, []);

  // Subscribe to offline outbox sync status
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status, count) => {
      setSyncStatus(status);
      setPendingSyncCount(count);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to room updates via WebSocket
  useEffect(() => {
    if (!code) return;

    let isMounted = true;
    setLoading(true);

    getRoom(code)
      .then((initial) => {
        if (!isMounted) return;
        if (!initial) {
          setError(`Room "${code.toUpperCase()}" not found.`);
        } else {
          setRoom(initial);
          // Set initial view mode based on claims
          if (viewMode === null) {
            const isClaimant = initial.claims.teamA === deviceId || initial.claims.teamB === deviceId;
            setViewMode(isClaimant ? 'console' : 'viewer');
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load scoreboard');
        setLoading(false);
      });

    const unsubscribe = subscribeToRoom(code, (updatedRoom) => {
      if (!isMounted) return;
      setRoom(updatedRoom);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [code, deviceId]);

  // Clear undo toast after 4s
  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => setUndoToast(null), 4000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  // =========================================================================
  // ACTIONS: CRICKET BALL SCORING
  // =========================================================================

  const handleCricketBall = async (
    runsOffBat: number,
    options: {
      extraType?: string;
      extraRuns?: number;
      isWicket?: boolean;
      wicketType?: string | null;
      dismissedPlayerId?: string | null;
      fielderId?: string | null;
      newBatterId?: string | null;
    } = {}
  ) => {
    if (!room) return;
    const battingTeamKey = room.battingTeam || 'teamA';
    setActionError(null);

    // Haptics
    if (options.isWicket) triggerHaptic('wicket');
    else if (runsOffBat === 4 || runsOffBat === 6) triggerHaptic('boundary');
    else triggerHaptic('tap');

    try {
      const res = await submitBallScore(
        room.code,
        battingTeamKey,
        deviceId,
        {
          runsOffBat,
          extraType: options.extraType || 'none',
          extraRuns: options.extraRuns || 0,
          isWicket: options.isWicket || false,
          wicketType: options.wicketType || null,
          dismissedPlayerId: options.dismissedPlayerId || null,
          fielderId: options.fielderId || null,
          newBatterId: options.newBatterId || null,
        },
        room.revision
      );

      if (!res.success && res.error) {
        setActionError(res.error);
      } else if (res.room) {
        setRoom(res.room);
      }
      setActiveExtraType(null);
      setExtraAdditionalRuns(0);
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit ball');
    }
  };

  // Strike Swap
  const handleSwapStrike = async () => {
    if (!room) return;
    triggerHaptic('tap');
    setActionError(null);
    try {
      const res = await updateCrease(room.code, deviceId, { swapStrike: true });
      if (!res.success && res.error) {
        setActionError(res.error);
      } else if (res.room) {
        setRoom(res.room);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to swap strike');
    }
  };

  // Assign bowler
  const handleSelectBowler = async (bowlerId: string) => {
    if (!room) return;
    triggerHaptic('tap');
    setActionError(null);
    try {
      const res = await updateCrease(room.code, deviceId, { bowlerId });
      if (!res.success && res.error) {
        setActionError(res.error);
      } else if (res.room) {
        setRoom(res.room);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign bowler');
    }
  };


  // =========================================================================
  // ACTIONS: FOOTBALL SCORING
  // =========================================================================

  const handleGoalSubmit = async (
    team: TeamKey,
    goalData: {
      scorerId?: string | null;
      assistId?: string | null;
      goalType?: 'goal' | 'penalty' | 'own_goal';
    }
  ) => {
    if (!room) return;
    triggerHaptic('goal');
    setActionError(null);

    const minute = room.footballState
      ? Math.floor(room.footballState.clockAccumulatedMs / 60000) + 1
      : 1;

    try {
      const res = await submitGoal(
        room.code,
        team,
        deviceId,
        {
          ...goalData,
          minute,
          period: room.phase === 'extra_time' ? 'extra_time' : 'regular',
        },
        room.revision
      );

      if (!res.success && res.error) {
        setActionError(res.error);
      } else if (res.room) {
        setRoom(res.room);
      }
      setGoalSheetData(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to record goal');
    }
  };

  const handleFootballStat = async (team: TeamKey, action: ScoreAction) => {
    if (!room) return;
    triggerHaptic('tap');
    setActionError(null);
    try {
      const res = await submitScoreEvent(room.code, team, action, deviceId);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setRoom(res.room);
      }
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    }
  };

  // Clock Control
  const handleClockAction = async (clockAction: ClockAction) => {
    if (!room) return;
    triggerHaptic('tap');
    setActionError(null);
    try {
      const res = await updateFootballClock(room.code, clockAction, deviceId);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setRoom(res.room);
      }
    } catch (err: any) {
      setActionError(err.message || 'Clock action failed');
    }
  };

  // =========================================================================
  // ACTIONS: UNDO, CLAIM, RELEASE, HANDOVER
  // =========================================================================

  const handleUndo = async (team: TeamKey) => {
    if (!room) return;
    triggerHaptic('tap');
    setActionError(null);
    try {
      const res = await undoLastScoreEvent(room.code, team, deviceId);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setRoom(res.room);
        const label = res.undoneEvent?.label || 'Last score event';
        setUndoToast({ message: `Undone: ${label}`, timestamp: Date.now() });
      }
    } catch (err: any) {
      setActionError(err.message || 'Undo failed');
    }
  };

  const handleClaim = async (team: TeamKey) => {
    if (!room) return;
    triggerHaptic('tap');
    setActionError(null);
    try {
      const res = await claimTeam(room.code, team, deviceId);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setRoom(res.room);
        setViewMode('console');
      }
    } catch (err: any) {
      setActionError(err.message || 'Claim failed');
    }
  };

  const handleReleaseClaim = async (team: TeamKey) => {
    if (!room) return;
    triggerHaptic('tap');
    setActionError(null);
    try {
      const res = await releaseTeamClaim(room.code, team, deviceId);
      setRoom(res.room);
    } catch (err: any) {
      setActionError(err.message || 'Release failed');
    }
  };

  const handleHostResetScorer = async (targetTeam: TeamKey) => {
    if (!room) return;
    setActionError(null);
    try {
      const res = await resetScorer(room.code, deviceId, targetTeam);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else if (res.room) {
        setRoom(res.room);
        setShowResetScorerModal(false);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to reset scorer');
    }
  };

  // Declare Innings (Cricket)
  const handleDeclare = async () => {
    if (!room) return;
    setDeclaring(true);
    setActionError(null);
    try {
      const res = await declareInnings(room.code, deviceId);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setRoom(res.room);
        setShowDeclareModal(false);
      }
    } catch (err: any) {
      setActionError(err.message || 'Declaration failed');
    } finally {
      setDeclaring(false);
    }
  };

  // Host End Match Early
  const handleEndMatchEarly = async () => {
    if (!room) return;
    setEndingMatch(true);
    setActionError(null);
    try {
      const res = await endMatchEarly(room.code, deviceId, endReason.trim() || undefined);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setRoom(res.room);
        setShowEndModal(false);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to end match');
    } finally {
      setEndingMatch(false);
    }
  };

  // =========================================================================
  // LOADING & ERROR SCREENS
  // =========================================================================

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.6rem', color: 'var(--accent-floodlight)' }}>
          TUNING FLOODLIGHTS &amp; SYNCHRONIZING SCOREBOARD...
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '520px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-scoreboard)',
          }}
        >
          <AlertCircle size={48} color="var(--status-live)" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>Match Room Not Found</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
            {error || `Room code "${code}" does not exist.`}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => navigate('/join')} className="btn btn-primary">
              Try Another Code
            </button>
            <button onClick={() => navigate('/create')} className="btn btn-surface">
              Create New Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ROOM PHASES STATE MACHINE ROUTING
  // =========================================================================

  if (room.phase === 'waiting_for_opponent') {
    return <WaitingScreen room={room} deviceId={deviceId} />;
  }

  if (room.phase === 'toss_pending' || room.phase === 'toss_result') {
    return <CoinTossScreen room={room} deviceId={deviceId} />;
  }

  if (room.phase === 'choice_pending') {
    return <TossChoiceScreen room={room} deviceId={deviceId} />;
  }

  if (room.phase === 'innings_break') {
    return <InningsBreakScreen room={room} deviceId={deviceId} />;
  }

  if (room.phase === 'half_time') {
    return <HalfTimeScreen room={room} deviceId={deviceId} />;
  }

  if (room.phase === 'shootout') {
    return <ShootoutScreen room={room} deviceId={deviceId} />;
  }

  if (room.phase === 'finished') {
    return <ResultScreen room={room} deviceId={deviceId} />;
  }

  // =========================================================================
  // ROLES & ACCESS CHECK
  // =========================================================================

  const isCricket = room.sport === 'cricket';
  const isFootball = room.sport === 'football';

  const hasClaimedTeamA = room.claims.teamA === deviceId;
  const hasClaimedTeamB = room.claims.teamB === deviceId;
  const isTeamAClaimedByOther = room.claims.teamA !== null && !hasClaimedTeamA;
  const isTeamBClaimedByOther = room.claims.teamB !== null && !hasClaimedTeamB;
  const isSpectatorOnly = !hasClaimedTeamA && !hasClaimedTeamB;
  const isHost = !room.hostDeviceId || room.hostDeviceId === deviceId;

  // Active scorer team
  const myScorerTeam: TeamKey | null = hasClaimedTeamA ? 'teamA' : hasClaimedTeamB ? 'teamB' : null;

  // Cricket batting/fielding roles
  const battingTeamKey: TeamKey = room.battingTeam || 'teamA';
  const fieldingTeamKey: TeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';
  const isMyTeamBatting = myScorerTeam === battingTeamKey;
  const isMyTeamFielding = myScorerTeam === fieldingTeamKey;

  // =========================================================================
  // VIEW MODE: VIEWER MATCH CENTER
  // =========================================================================

  if (viewMode === 'viewer') {
    return (
      <>
        <MatchCenter
          room={room}
          isScorer={!isSpectatorOnly}
          onBackToConsole={() => setViewMode('console')}
          onShareClick={() => setShowShareModal(true)}
          syncStatus={syncStatus}
        />

        {showShareModal && (
          <ShareModal
            code={room.code}
            sport={room.sport}
            teamAName={room.teamA.name}
            teamBName={room.teamB.name}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </>
    );
  }

  // =========================================================================
  // VIEW MODE: SCORER CONSOLE (Dense, Fast, Dark Mode)
  // =========================================================================

  const cState = room.cricketState;
  const fState = room.footballState;

  return (
    <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '4rem' }}>
      {/* Reaction Overlay for animations */}
      <ReactionOverlay lastEvent={room.lastEvent || null} />

      {/* Persistent Undo Confirm Toast */}
      {undoToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: '1.5px solid var(--accent-floodlight)',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={18} color="var(--accent-floodlight)" />
          <span>{undoToast.message}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLS BAR */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {/* Left: Back & Live Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-surface btn-sm"
            aria-label="Back to home"
            style={{ padding: '0.45rem' }}
          >
            <ArrowLeft size={16} />
          </button>

          <LiveIndicator />

          {/* Sync Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: syncStatus === 'live' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(217, 119, 6, 0.15)',
              border: `1px solid ${syncStatus === 'live' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`,
              color: syncStatus === 'live' ? '#10B981' : '#F59E0B',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-scoreboard)',
              letterSpacing: '0.04em',
            }}
          >
            <Circle size={6} fill="currentColor" />
            <span>
              {syncStatus === 'live'
                ? 'LIVE'
                : syncStatus === 'syncing'
                ? `SYNCING ${pendingSyncCount}...`
                : `OFFLINE (${pendingSyncCount})`}
            </span>
          </div>

          {/* Haptics Toggle */}
          <button
            onClick={toggleHaptics}
            title={hapticsEnabled ? 'Haptics: ON (tap to mute)' : 'Haptics: OFF (tap to enable)'}
            className="btn btn-surface btn-sm"
            style={{
              padding: '0.4rem 0.55rem',
              color: hapticsEnabled ? 'var(--accent-floodlight)' : 'var(--text-tertiary)',
            }}
          >
            <Vibrate size={15} />
          </button>

          {/* Switch to Viewer Match Center */}
          <button
            onClick={() => setViewMode('viewer')}
            className="btn btn-surface btn-sm"
            style={{
              gap: '0.35rem',
              fontSize: '0.8rem',
              color: 'var(--accent-floodlight)',
              borderColor: 'rgba(242, 201, 76, 0.3)',
            }}
          >
            <Radio size={14} />
            <span>Match Center</span>
          </button>
        </div>

        {/* Right: Host Actions & Share */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {/* Host Reset Scorer */}
          {isHost && (
            <button
              onClick={() => setShowResetScorerModal(true)}
              className="btn btn-surface btn-sm"
              style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
              title="Host: Reset scorer claims if a phone disconnected"
            >
              Reset Scorer
            </button>
          )}

          {/* Declare Innings (Cricket) */}
          {isCricket && (hasClaimedTeamA || hasClaimedTeamB) && (
            <button
              onClick={() => setShowDeclareModal(true)}
              className="btn btn-surface btn-sm"
              style={{ fontSize: '0.8rem', gap: '0.35rem' }}
              title="Declare innings early"
            >
              <Flag size={13} color="var(--accent-floodlight)" />
              <span>Declare</span>
            </button>
          )}

          {/* End Match Early */}
          {isHost && (
            <button
              onClick={() => setShowEndModal(true)}
              className="btn btn-surface btn-sm"
              style={{ borderColor: 'var(--status-live)', color: 'var(--status-live)', fontSize: '0.8rem', gap: '0.35rem' }}
            >
              <StopCircle size={13} />
              <span>End Match</span>
            </button>
          )}

          {/* QR Share */}
          <button
            onClick={() => setShowShareModal(true)}
            className="btn btn-surface btn-sm"
            style={{
              borderColor: 'var(--accent-floodlight)',
              color: 'var(--accent-floodlight)',
              fontSize: '0.82rem',
              gap: '0.35rem',
            }}
          >
            <QrCode size={15} />
            <span style={{ fontWeight: 800 }}>{room.code}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {actionError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(232, 93, 74, 0.15)',
            border: '1px solid var(--status-live)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--status-live)',
            fontSize: '0.88rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} style={{ color: 'inherit', fontWeight: 'bold' }}>
            ✕
          </button>
        </div>
      )}

      {/* Spectator notice */}
      {isSpectatorOnly && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={16} color="var(--accent-floodlight)" />
            <span>Spectator view. Claim a team below to take the scorer console.</span>
          </div>
          <button
            onClick={() => setViewMode('viewer')}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.78rem' }}
          >
            Switch to Match Center
          </button>
        </div>
      )}

      {/* =========================================================================
          CRICKET SCORER INTERFACE
          ========================================================================= */}
      {isCricket && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* CRICKET HEADLINE SCORE & OVERS */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  {cState?.innings === 1 ? '1st Innings' : '2nd Innings'} • {room[battingTeamKey].name} Batting
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-scoreboard)',
                    fontSize: '3.2rem',
                    fontWeight: 900,
                    color: 'var(--accent-floodlight)',
                    lineHeight: 1,
                  }}
                >
                  {room[battingTeamKey].cricketScore?.runs ?? 0}
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '2.4rem' }}>/</span>
                  <span style={{ color: 'var(--status-live)', fontSize: '2.8rem' }}>
                    {room[battingTeamKey].cricketScore?.wickets ?? 0}
                  </span>
                </span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.6rem', color: 'var(--text-secondary)' }}>
                  ({cState?.oversFormatted ?? '0.0'} / {room.rules?.oversPerInnings || 20} ov)
                </span>
              </div>
            </div>

            {/* Run Rates & Chase */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                CRR: <strong style={{ color: 'var(--accent-floodlight)' }}>{cState?.currentRunRate ?? 0}</strong>
                {cState?.innings === 2 && cState.requiredRunRate != null && (
                  <span style={{ marginLeft: '0.75rem' }}>
                    RRR: <strong style={{ color: 'var(--status-live)' }}>{cState.requiredRunRate}</strong>
                  </span>
                )}
              </div>

              {cState?.innings === 2 && cState.chaseText && (
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-floodlight)', fontWeight: 700 }}>
                  {cState.chaseText}
                </div>
              )}
            </div>

            {/* Current Over Dots */}
            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <CricketOverDots
                legalBalls={cState?.legalBallsInInnings ?? 0}
                events={room.events}
              />
            </div>
          </div>

          {/* CREASE STATUS CARD */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                On The Crease
              </span>

              {/* Batting controls: Swap Strike */}
              {isMyTeamBatting && (
                <button
                  onClick={handleSwapStrike}
                  className="btn btn-outline btn-sm"
                  style={{ gap: '0.35rem', fontSize: '0.78rem' }}
                  title="Swap Striker and Non-Striker"
                >
                  <ArrowRightLeft size={13} />
                  <span>Swap Strike</span>
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {/* Striker */}
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Striker *
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {cState?.crease?.striker?.name || 'Striker (Not set)'}
                  </strong>
                  <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.15rem', color: 'var(--accent-floodlight)' }}>
                    {cState?.crease?.striker ? `${cState.crease.striker.runs} (${cState.crease.striker.balls})` : ''}
                  </span>
                </div>
              </div>

              {/* Non-Striker */}
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Non-Striker
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                    {cState?.crease?.nonStriker?.name || 'Non-Striker (Not set)'}
                  </strong>
                  <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
                    {cState?.crease?.nonStriker ? `${cState.crease.nonStriker.runs} (${cState.crease.nonStriker.balls})` : ''}
                  </span>
                </div>
              </div>

              {/* Bowler */}
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Current Bowler ({room[fieldingTeamKey].name})
                  </span>
                  {isMyTeamFielding && (
                    <button
                      onClick={() => setShowBowlerSheet(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-floodlight)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Change Bowler
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {cState?.crease?.bowler?.name || 'Bowler (Not set)'}
                  </strong>
                  <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    {cState?.crease?.bowler
                      ? `${cState.crease.bowler.wickets}-${cState.crease.bowler.runs} (${cState.crease.bowler.oversFormatted} ov)`
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SCORER CONSOLE CONTROLS (Dense, Fast) */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
            }}
          >
            {/* Console Subheader with Persistent Undo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                  Scoring Console
                </span>
                {myScorerTeam && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(242, 201, 76, 0.15)',
                      color: 'var(--accent-floodlight)',
                    }}
                  >
                    Scoring for {room[myScorerTeam].name}
                  </span>
                )}
              </div>

              {/* Persistent Undo Button */}
              {myScorerTeam && (
                <button
                  onClick={() => handleUndo(myScorerTeam)}
                  className="btn btn-outline btn-sm"
                  style={{
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--status-live)',
                    borderColor: 'rgba(232, 93, 74, 0.4)',
                  }}
                  title="Undo latest score action for your team"
                >
                  <RotateCcw size={14} />
                  <span>Undo Last</span>
                </button>
              )}
            </div>

            {/* IF USER HAS NOT CLAIMED A TEAM */}
            {isSpectatorOnly ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  To score this match, claim one of the teams below:
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  {!isTeamAClaimedByOther && (
                    <button onClick={() => handleClaim('teamA')} className="btn btn-primary btn-sm">
                      Claim {room.teamA.name}
                    </button>
                  )}
                  {!isTeamBClaimedByOther && (
                    <button onClick={() => handleClaim('teamB')} className="btn btn-primary btn-sm">
                      Claim {room.teamB.name}
                    </button>
                  )}
                </div>
              </div>
            ) : isMyTeamFielding ? (
              /* CRICKET FIELDING SCORER VIEW: EXACTLY ONE ACTION (Set Bowler) */
              <div
                style={{
                  backgroundColor: 'rgba(15, 26, 20, 0.45)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <Shield size={28} color="var(--accent-floodlight)" />
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>
                    {room[fieldingTeamKey].name} is Fielding
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Current Bowler: <strong>{cState?.crease?.bowler?.name || 'Not assigned'}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    onClick={() => setShowBowlerSheet(true)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.9rem', padding: '0.55rem 1.25rem' }}
                  >
                    Select Next Bowler
                  </button>
                  <button
                    onClick={() => setSquadModalTeam(fieldingTeamKey)}
                    className="btn btn-surface btn-sm"
                    style={{ gap: '0.35rem' }}
                  >
                    <Users size={14} />
                    <span>Fielding Squad</span>
                  </button>
                </div>
              </div>
            ) : (
              /* CRICKET BATTING SCORER MATRIX */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {/* Row 1: Runs (Dot, 1, 2, 3) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleCricketBall(0)}
                    className="btn btn-surface"
                    style={{ padding: '0.85rem 0.2rem', fontSize: '1.1rem', fontWeight: 800 }}
                  >
                    Dot (0)
                  </button>
                  <button
                    onClick={() => handleCricketBall(1)}
                    className="btn btn-surface"
                    style={{ padding: '0.85rem 0.2rem', fontSize: '1.25rem', fontWeight: 800 }}
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleCricketBall(2)}
                    className="btn btn-surface"
                    style={{ padding: '0.85rem 0.2rem', fontSize: '1.25rem', fontWeight: 800 }}
                  >
                    +2
                  </button>
                  <button
                    onClick={() => handleCricketBall(3)}
                    className="btn btn-surface"
                    style={{ padding: '0.85rem 0.2rem', fontSize: '1.25rem', fontWeight: 800 }}
                  >
                    +3
                  </button>
                </div>

                {/* Row 2: Boundaries & Wicket (FOUR, SIX, WICKET) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.3fr', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleCricketBall(4)}
                    className="btn btn-surface"
                    style={{
                      padding: '0.95rem 0.2rem',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--status-boundary)',
                      border: '1.5px solid var(--status-boundary)',
                    }}
                  >
                    FOUR (+4)
                  </button>
                  <button
                    onClick={() => handleCricketBall(6)}
                    className="btn btn-surface"
                    style={{
                      padding: '0.95rem 0.2rem',
                      fontSize: '1.3rem',
                      fontWeight: 900,
                      color: '#0F1A14',
                      backgroundColor: 'var(--accent-floodlight)',
                      borderColor: 'var(--accent-floodlight)',
                    }}
                  >
                    SIX (+6)
                  </button>
                  <button
                    onClick={() => setShowWicketSheet(true)}
                    className="btn btn-surface"
                    style={{
                      padding: '0.95rem 0.2rem',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      backgroundColor: 'var(--status-live)',
                      borderColor: 'var(--status-live)',
                    }}
                  >
                    WICKET
                  </button>
                </div>

                {/* Row 3: Extras Buttons (Wide, No Ball, Bye, Leg Bye) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
                  <button
                    onClick={() => setActiveExtraType(activeExtraType === 'wide' ? null : 'wide')}
                    className="btn btn-outline btn-sm"
                    style={{
                      padding: '0.6rem 0.2rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderColor: activeExtraType === 'wide' ? 'var(--accent-floodlight)' : undefined,
                    }}
                  >
                    Wide
                  </button>
                  <button
                    onClick={() => setActiveExtraType(activeExtraType === 'no_ball' ? null : 'no_ball')}
                    className="btn btn-outline btn-sm"
                    style={{
                      padding: '0.6rem 0.2rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderColor: activeExtraType === 'no_ball' ? 'var(--accent-floodlight)' : undefined,
                    }}
                  >
                    No Ball
                  </button>
                  <button
                    onClick={() => setActiveExtraType(activeExtraType === 'bye' ? null : 'bye')}
                    className="btn btn-outline btn-sm"
                    style={{
                      padding: '0.6rem 0.2rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderColor: activeExtraType === 'bye' ? 'var(--accent-floodlight)' : undefined,
                    }}
                  >
                    Bye
                  </button>
                  <button
                    onClick={() => setActiveExtraType(activeExtraType === 'leg_bye' ? null : 'leg_bye')}
                    className="btn btn-outline btn-sm"
                    style={{
                      padding: '0.6rem 0.2rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderColor: activeExtraType === 'leg_bye' ? 'var(--accent-floodlight)' : undefined,
                    }}
                  >
                    Leg Bye
                  </button>
                </div>

                {/* Inline Extras Stepper / Drawer */}
                {activeExtraType && (
                  <div
                    style={{
                      backgroundColor: 'rgba(242, 201, 76, 0.08)',
                      border: '1.5px solid var(--accent-floodlight)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-floodlight)', textTransform: 'uppercase' }}>
                        {activeExtraType.replace('_', ' ')}: Additional runs off bat
                      </span>
                      <button
                        onClick={() => setActiveExtraType(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {[0, 1, 2, 3, 4, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setExtraAdditionalRuns(num)}
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.2rem',
                            borderRadius: '6px',
                            border: extraAdditionalRuns === num ? '2px solid var(--accent-floodlight)' : '1px solid var(--border-subtle)',
                            backgroundColor: extraAdditionalRuns === num ? 'var(--accent-floodlight)' : 'var(--bg-primary)',
                            color: extraAdditionalRuns === num ? '#0F1A14' : 'var(--text-primary)',
                            fontFamily: 'var(--font-scoreboard)',
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          +{num}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        handleCricketBall(extraAdditionalRuns, {
                          extraType: activeExtraType,
                          extraRuns: (activeExtraType === 'wide' || activeExtraType === 'no_ball') ? 1 : 0,
                        })
                      }
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.95rem' }}
                    >
                      Confirm {activeExtraType.replace('_', ' ').toUpperCase()} (+
                      {(activeExtraType === 'wide' || activeExtraType === 'no_ball' ? 1 : 0) + extraAdditionalRuns} runs)
                    </button>
                  </div>
                )}

                {/* Squad Edit & Role Handover buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSquadModalTeam(battingTeamKey)}
                    className="btn btn-surface btn-sm"
                    style={{ flex: 1, gap: '0.35rem', fontSize: '0.8rem' }}
                  >
                    <Users size={14} />
                    <span>Manage Batting Squad</span>
                  </button>

                  <button
                    onClick={() => handleReleaseClaim(battingTeamKey)}
                    className="btn btn-surface btn-sm"
                    style={{ flex: 1, gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}
                    title="Release claim so another device can score"
                  >
                    <Unlock size={14} />
                    <span>Hand Over Role</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          FOOTBALL SCORER INTERFACE
          ========================================================================= */}
      {isFootball && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* FOOTBALL CLOCK & CONTROLS */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            {fState && (
              <FootballClock
                clockRunning={fState.clockRunning}
                clockAccumulatedMs={fState.clockAccumulatedMs}
                clockLastStartedAt={fState.clockLastStartedAt}
                currentHalf={fState.currentHalf}
                halfMinutes={room.rules?.halfMinutes || 45}
                isExtraTime={room.phase === 'extra_time'}
              />
            )}

            {/* Clock control buttons */}
            {(hasClaimedTeamA || hasClaimedTeamB) && fState && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {!fState.clockRunning ? (
                  <button
                    onClick={() => handleClockAction('resume')}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '0.35rem' }}
                  >
                    <Play size={14} fill="currentColor" />
                    <span>{fState.clockAccumulatedMs === 0 ? 'Start Clock' : 'Resume'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleClockAction('pause')}
                    className="btn btn-surface btn-sm"
                    style={{ gap: '0.35rem' }}
                  >
                    <Pause size={14} fill="currentColor" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={() => handleClockAction('end_half')}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  End Half
                </button>
              </div>
            )}
          </div>

          {/* TWO TEAM FOOTBALL CARDS SIDE BY SIDE */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {(['teamA', 'teamB'] as TeamKey[]).map((tKey) => {
              const teamData = room[tKey];
              const isClaimed = room.claims[tKey] === deviceId;
              const isClaimedOther = room.claims[tKey] !== null && !isClaimed;

              return (
                <div
                  key={tKey}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: isClaimed ? '2px solid var(--accent-floodlight)' : '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                          {teamData.name}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          {tKey === 'teamA' ? 'Team 1' : 'Team 2'}
                        </span>
                      </div>

                      {/* Claim Status */}
                      {isClaimed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(242, 201, 76, 0.15)',
                              color: 'var(--accent-floodlight)',
                            }}
                          >
                            Scorer
                          </span>
                          <button
                            onClick={() => handleReleaseClaim(tKey)}
                            title="Release claim"
                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                          >
                            <Unlock size={14} />
                          </button>
                        </div>
                      ) : isClaimedOther ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Other Scorer</span>
                      ) : (
                        <button onClick={() => handleClaim(tKey)} className="btn btn-surface btn-sm" style={{ fontSize: '0.78rem' }}>
                          Claim Team
                        </button>
                      )}
                    </div>

                    {/* Score Digits */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        textAlign: 'center',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                        Goals
                      </div>
                      <ScoreDigit
                        value={teamData.footballScore?.goals ?? 0}
                        size="giant"
                        color="var(--accent-floodlight)"
                      />

                      {/* Stats */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                        <span>🟨 {teamData.footballScore?.yellowCards ?? 0}</span>
                        <span>🟥 {teamData.footballScore?.redCards ?? 0}</span>
                        <span>🚩 {teamData.footballScore?.corners ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scorer Controls */}
                  {isClaimed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Scoring
                        </span>
                        <button
                          onClick={() => handleUndo(tKey)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                        >
                          <RotateCcw size={12} />
                          <span>Undo</span>
                        </button>
                      </div>

                      {/* Goal button */}
                      <button
                        onClick={() => setGoalSheetData({ isOpen: true, team: tKey })}
                        className="btn btn-primary"
                        style={{ padding: '0.75rem', fontSize: '1.1rem', fontWeight: 800 }}
                      >
                        ⚽ +1 GOAL
                      </button>

                      {/* Cards & Corner */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleFootballStat(tKey, { type: 'FOOTBALL_CARD', cardType: 'yellow' })}
                          className="btn btn-surface btn-sm"
                          style={{ fontSize: '0.8rem' }}
                        >
                          🟨 Yellow
                        </button>
                        <button
                          onClick={() => handleFootballStat(tKey, { type: 'FOOTBALL_CARD', cardType: 'red' })}
                          className="btn btn-surface btn-sm"
                          style={{ fontSize: '0.8rem' }}
                        >
                          🟥 Red
                        </button>
                        <button
                          onClick={() => handleFootballStat(tKey, { type: 'FOOTBALL_STAT', stat: 'corner' })}
                          className="btn btn-surface btn-sm"
                          style={{ fontSize: '0.8rem' }}
                        >
                          🚩 Corner
                        </button>
                      </div>

                      {/* Squad button */}
                      <button
                        onClick={() => setSquadModalTeam(tKey)}
                        className="btn btn-surface btn-sm"
                        style={{ marginTop: '0.25rem', gap: '0.35rem', fontSize: '0.8rem' }}
                      >
                        <Users size={13} />
                        <span>Manage Squad</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE MATCH FEED (EVENT LOG)
          ========================================================================= */}
      <div
        style={{
          marginTop: '1.5rem',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Live Match Feed</h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            {room.events.filter((e) => !e.undone).length} events recorded
          </span>
        </div>

        {room.events.length === 0 ? (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
            Recorded events will appear here in real time.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '320px', overflowY: 'auto' }}>
            {room.events.slice(0, 30).map((evt, idx) => {
              const teamName = evt.team === 'teamA' ? room.teamA.name : room.teamB.name;
              return (
                <div
                  key={evt.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    backgroundColor: evt.undone ? 'rgba(0,0,0,0.2)' : 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    opacity: evt.undone ? 0.45 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--bg-surface-elevated)',
                        color: evt.team === 'teamA' ? 'var(--text-primary)' : 'var(--accent-floodlight)',
                      }}
                    >
                      {teamName}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.92rem', color: evt.undone ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                      {evt.label}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODALS & SHEETS
          ========================================================================= */}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          code={room.code}
          sport={room.sport}
          teamAName={room.teamA.name}
          teamBName={room.teamB.name}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Squad Management Sheet */}
      {squadModalTeam && (
        <SquadSheet
          room={room}
          team={squadModalTeam}
          deviceId={deviceId}
          isOpen={true}
          onClose={() => setSquadModalTeam(null)}
          onSaved={(updated) => setRoom(updated)}
        />
      )}

      {/* Cricket Wicket Dismissal Sheet */}
      {showWicketSheet && (
        <WicketSheet
          isOpen={true}
          onClose={() => setShowWicketSheet(false)}
          room={room}
          battingTeamKey={battingTeamKey}
          onConfirm={(data) => {
            setShowWicketSheet(false);
            handleCricketBall(data.runsOffBat || 0, {
              isWicket: true,
              wicketType: data.wicketType,
              dismissedPlayerId: data.dismissedPlayerId,
              fielderId: data.fielderId,
              newBatterId: data.newBatterId,
            });
          }}
        />
      )}

      {/* Football Goal Detail Sheet */}
      {goalSheetData && goalSheetData.isOpen && (
        <GoalSheet
          isOpen={true}
          onClose={() => setGoalSheetData(null)}
          room={room}
          scoringTeamKey={goalSheetData.team}
          onConfirm={(data) => {
            handleGoalSubmit(goalSheetData.team, data);
          }}
        />
      )}

      {/* Cricket Bowler Assignment Sheet */}
      {showBowlerSheet && (
        <BowlerSheet
          isOpen={true}
          onClose={() => setShowBowlerSheet(false)}
          room={room}
          fieldingTeamKey={fieldingTeamKey}
          onSelectBowler={(bowlerId) => {
            handleSelectBowler(bowlerId);
          }}
        />
      )}

      {/* Host Reset Scorer Modal */}
      {showResetScorerModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 12, 8, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 120,
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
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Reset Scorer Claim</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              If a scorer's device ran out of battery or disconnected, the host can reset their claim so someone else can score.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                onClick={() => handleHostResetScorer('teamA')}
                className="btn btn-surface"
                style={{ padding: '0.75rem' }}
              >
                Reset {room.teamA.name} Scorer
              </button>
              <button
                onClick={() => handleHostResetScorer('teamB')}
                className="btn btn-surface"
                style={{ padding: '0.75rem' }}
              >
                Reset {room.teamB.name} Scorer
              </button>
            </div>

            <button onClick={() => setShowResetScorerModal(false)} className="btn btn-outline btn-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Host End Match Early Modal */}
      {showEndModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 12, 8, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1.5px solid var(--status-live)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-scoreboard)',
              textAlign: 'center',
            }}
          >
            <StopCircle size={36} color="var(--status-live)" style={{ margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>End Match Early?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              This will permanently finish the match with the current score and lock the room for all players.
            </p>

            <input
              type="text"
              placeholder="Optional reason (e.g. Rain, Time, Friendly call)"
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                marginBottom: '1.25rem',
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowEndModal(false)} className="btn btn-surface" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={handleEndMatchEarly}
                disabled={endingMatch}
                className="btn btn-primary"
                style={{ flex: 1, backgroundColor: 'var(--status-live)', borderColor: 'var(--status-live)' }}
              >
                {endingMatch ? 'Ending...' : 'Confirm End Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cricket Declare Innings Modal */}
      {showDeclareModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 12, 8, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 110,
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
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-scoreboard)',
              textAlign: 'center',
            }}
          >
            <Flag size={36} color="var(--accent-floodlight)" style={{ margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Declare Innings Early?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              This declares the current batting innings as closed. If in 1st innings, advances directly to the Innings Break with target set.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowDeclareModal(false)} className="btn btn-surface" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={handleDeclare}
                disabled={declaring}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {declaring ? 'Declaring...' : 'Confirm Declare'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
