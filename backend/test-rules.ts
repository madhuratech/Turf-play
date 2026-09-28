import process from 'node:process';

const BASE_URL = 'http://localhost:4000';

async function request(path: string, options: any = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🚀 Starting Comprehensive Match Rules & Auto-End Test Suite...\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // =========================================================================
  // TEST 1: CRICKET 2-OVER MATCH (12 LEGAL BALLS, WIDES, TARGET CHASED)
  // =========================================================================
  console.log('--- Test 1: Cricket 2-Over Match ---');

  const devHost = 'device_host_111';
  const devOpp = 'device_opp_222';
  const devViewer = 'device_viewer_999';

  const roomRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      sport: 'cricket',
      teamAName: 'Warriors XI',
      teamBName: 'Titans CC',
      hostDeviceId: devHost,
      rules: {
        oversPerInnings: 2,
        playersPerSide: 11,
        wideNoBallRerun: true,
      },
    }),
  });

  assert(roomRes.ok, 'Created cricket room with 2 overs');
  const code = roomRes.data.code;
  assert(roomRes.data.rules?.oversPerInnings === 2, 'oversPerInnings is 2');
  assert(roomRes.data.rules?.maxWickets === 10, 'maxWickets is 10 (11 - 1)');

  // Claims
  await request(`/rooms/${code}/claim`, { method: 'POST', body: JSON.stringify({ team: 'A', deviceId: devHost }) });
  const claimB = await request(`/rooms/${code}/claim`, { method: 'POST', body: JSON.stringify({ team: 'B', deviceId: devOpp }) });
  assert(claimB.data.room?.phase === 'toss_pending', 'Phase advanced to toss_pending after both claimed');

  // Toss flip
  const tossRes = await request(`/rooms/${code}/toss`, { method: 'POST', body: JSON.stringify({ deviceId: devHost }) });
  assert(tossRes.ok, 'Toss successfully flipped');

  // Wait 1.2s for toss auto-advance to choice_pending
  await new Promise((r) => setTimeout(r, 1200));

  const roomAfterToss = await request(`/rooms/${code}`);
  const winner = roomAfterToss.data.tossWinner;
  const winningDevice = winner === 'teamA' ? devHost : devOpp;

  // Toss choice
  const choiceRes = await request(`/rooms/${code}/toss-choice`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: winningDevice, choice: 'bat' }),
  });
  assert(choiceRes.data.room?.phase === 'in_progress', 'Phase is in_progress');
  assert(choiceRes.data.room?.battingTeam === winner, 'Batting team is toss winner');

  const battingTeam = choiceRes.data.room.battingTeam;
  const fieldingTeam = battingTeam === 'teamA' ? 'teamB' : 'teamA';
  const battingDevice = battingTeam === 'teamA' ? devHost : devOpp;
  const fieldingDevice = battingTeam === 'teamA' ? devOpp : devHost;

  // Security checks: Viewer and fielding team cannot score
  const viewerScore = await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: devViewer, team: battingTeam, action: { type: 'CRICKET_RUN', runs: 1 } }),
  });
  assert(viewerScore.status === 403, 'Viewer device rejected with 403');

  const fieldingScore = await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: fieldingDevice, team: fieldingTeam, action: { type: 'CRICKET_RUN', runs: 1 } }),
  });
  assert(fieldingScore.status === 403, 'Fielding team scorer cannot score (403)');

  // Score 11 legal balls (1 run each)
  for (let i = 1; i <= 11; i++) {
    await request(`/rooms/${code}/score`, {
      method: 'POST',
      body: JSON.stringify({ deviceId: battingDevice, team: battingTeam, action: { type: 'CRICKET_RUN', runs: 1 } }),
    });
  }

  // Score 2 Wides (+1 each, should NOT increment legal balls)
  await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: battingDevice, team: battingTeam, action: { type: 'CRICKET_EXTRA', extraType: 'wide', runs: 1 } }),
  });
  await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: battingDevice, team: battingTeam, action: { type: 'CRICKET_EXTRA', extraType: 'wide', runs: 1 } }),
  });

  const checkMid = await request(`/rooms/${code}`);
  assert(checkMid.data.cricketState?.legalBallsInInnings === 11, 'Wides did not consume legal balls (11 legal balls)');
  assert(checkMid.data[battingTeam].cricketScore.runs === 13, 'Runs include 11 runs + 2 wide extras = 13 runs');

  // 12th legal ball (Dot) -> should complete overs and trigger innings_break!
  const ball12Res = await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: battingDevice, team: battingTeam, action: { type: 'CRICKET_DOT' } }),
  });

  assert(ball12Res.data.room?.phase === 'innings_break', 'Innings 1 auto-ended at 12 legal balls -> innings_break');
  assert(ball12Res.data.room?.cricketState?.target === 14, 'Target set to 14 (13 + 1)');
  assert(ball12Res.data.room?.cricketState?.firstInningsRuns === 13, 'firstInningsRuns recorded as 13');

  // Start 2nd innings
  const start2ndRes = await request(`/rooms/${code}/start-innings`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: fieldingDevice }),
  });
  assert(start2ndRes.data.room?.phase === 'in_progress', '2nd innings started -> in_progress');
  assert(start2ndRes.data.room?.battingTeam === fieldingTeam, 'Batting team flipped to second team');
  assert(start2ndRes.data.room?.cricketState?.legalBallsInInnings === 0, 'legalBallsInInnings reset to 0');

  const chasingTeam = fieldingTeam;
  const chasingDevice = fieldingDevice;

  // Chase target: score two SIXES (+12) + one TWO (+2) = 14 runs!
  await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: chasingDevice, team: chasingTeam, action: { type: 'CRICKET_RUN', runs: 6, isBoundary: 'six' } }),
  });
  await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: chasingDevice, team: chasingTeam, action: { type: 'CRICKET_RUN', runs: 6, isBoundary: 'six' } }),
  });
  const winBall = await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: chasingDevice, team: chasingTeam, action: { type: 'CRICKET_RUN', runs: 2 } }),
  });

  assert(winBall.data.room?.phase === 'finished', 'Target reached -> Phase automatically finished!');
  assert(winBall.data.room?.result?.winner === chasingTeam, 'Chasing team is winner');
  assert(winBall.data.room?.result?.endedReason === 'target_chased', 'endedReason is target_chased');
  assert(winBall.data.room?.result?.resultText?.includes('won by 10 wickets'), `Result text says won by 10 wickets: "${winBall.data.room?.result?.resultText}"`);

  // Subsequent scoring must be rejected when finished
  const afterFinishScore = await request(`/rooms/${code}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: chasingDevice, team: chasingTeam, action: { type: 'CRICKET_RUN', runs: 1 } }),
  });
  assert(afterFinishScore.status === 400 && afterFinishScore.data.code === 'MATCH_FINISHED', 'Subsequent scoring rejected with MATCH_FINISHED');

  // =========================================================================
  // TEST 2: CRICKET MATCH TIED
  // =========================================================================
  console.log('\n--- Test 2: Cricket Match Tied ---');

  const tieRoomRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      sport: 'cricket',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      rules: { oversPerInnings: 1, playersPerSide: 6 },
    }),
  });
  const tieCode = tieRoomRes.data.code;
  await request(`/rooms/${tieCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'A', deviceId: 'dev_a' }) });
  await request(`/rooms/${tieCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'B', deviceId: 'dev_b' }) });
  await request(`/rooms/${tieCode}/toss`, { method: 'POST', body: JSON.stringify({ deviceId: 'dev_a' }) });
  await new Promise((r) => setTimeout(r, 1200));
  const tRoom = await request(`/rooms/${tieCode}`);
  const tWinner = tRoom.data.tossWinner;
  const tWinDev = tWinner === 'teamA' ? 'dev_a' : 'dev_b';
  await request(`/rooms/${tieCode}/toss-choice`, { method: 'POST', body: JSON.stringify({ deviceId: tWinDev, choice: 'bat' }) });

  // 1st innings: 6 legal balls of 1 run = 6 runs
  for (let i = 0; i < 6; i++) {
    await request(`/rooms/${tieCode}/score`, {
      method: 'POST',
      body: JSON.stringify({ deviceId: tWinDev, team: tWinner, action: { type: 'CRICKET_RUN', runs: 1 } }),
    });
  }

  // Start 2nd innings
  const tChaseTeam = tWinner === 'teamA' ? 'teamB' : 'teamA';
  const tChaseDev = tWinner === 'teamA' ? 'dev_b' : 'dev_a';
  await request(`/rooms/${tieCode}/start-innings`, { method: 'POST', body: JSON.stringify({ deviceId: tChaseDev }) });

  // 2nd innings: exactly 6 runs in 6 balls (equal to 1st innings score)
  // 5 balls of 1 run (5 runs) + 6th ball of 1 run (6 runs) -> overs exhausted with equal runs!
  for (let i = 0; i < 6; i++) {
    await request(`/rooms/${tieCode}/score`, {
      method: 'POST',
      body: JSON.stringify({ deviceId: tChaseDev, team: tChaseTeam, action: { type: 'CRICKET_RUN', runs: 1 } }),
    });
  }

  const tieFinal = await request(`/rooms/${tieCode}`);
  assert(tieFinal.data.phase === 'finished', 'Overs exhausted -> phase is finished');
  assert(tieFinal.data.result?.winner === 'tie', 'resultWinner is tie');
  assert(tieFinal.data.result?.resultText === 'Match tied', 'resultText is Match tied');

  // =========================================================================
  // TEST 3: FOOTBALL 1-MINUTE HALVES, GOLDEN GOAL IN EXTRA TIME
  // =========================================================================
  console.log('\n--- Test 3: Football 1-Minute Halves & Golden Goal ---');

  const fbRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      sport: 'football',
      teamAName: 'City FC',
      teamBName: 'United FC',
      rules: {
        halfMinutes: 1,
        halves: 2,
        drawRule: 'golden_goal',
      },
    }),
  });
  const fbCode = fbRes.data.code;
  assert(fbRes.data.rules?.drawRule === 'golden_goal', 'drawRule is golden_goal');

  await request(`/rooms/${fbCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'A', deviceId: 'dev_fa' }) });
  await request(`/rooms/${fbCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'B', deviceId: 'dev_fb' }) });
  await request(`/rooms/${fbCode}/toss`, { method: 'POST', body: JSON.stringify({ deviceId: 'dev_fa' }) });
  await new Promise((r) => setTimeout(r, 1200));
  const fbAfterToss = await request(`/rooms/${fbCode}`);
  const fbTossWinDev = fbAfterToss.data.tossWinner === 'teamA' ? 'dev_fa' : 'dev_fb';
  await request(`/rooms/${fbCode}/toss-choice`, { method: 'POST', body: JSON.stringify({ deviceId: fbTossWinDev, choice: 'kickoff' }) });

  // Clock control: viewer rejected
  const viewerClock = await request(`/rooms/${fbCode}/clock`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: devViewer, action: 'start' }),
  });
  assert(viewerClock.status === 403, 'Viewer device cannot control clock (403)');

  // Scorer starts clock
  const startClock = await request(`/rooms/${fbCode}/clock`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_fa', action: 'start' }),
  });
  assert(startClock.data.room?.footballState?.clockRunning === true, 'Clock started and running');

  // Score 1 goal for team A
  await request(`/rooms/${fbCode}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_fa', team: 'teamA', action: { type: 'FOOTBALL_GOAL' } }),
  });

  // End 1st half
  const endHalf1 = await request(`/rooms/${fbCode}/clock`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_fa', action: 'end_half' }),
  });
  assert(endHalf1.data.room?.phase === 'half_time', 'End half -> Phase is half_time');

  // Start 2nd half
  const startHalf2 = await request(`/rooms/${fbCode}/clock`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_fa', action: 'start_second_half' }),
  });
  assert(startHalf2.data.room?.phase === 'in_progress', '2nd half started -> in_progress');
  assert(startHalf2.data.room?.footballState?.currentHalf === 2, 'currentHalf is 2');

  // Team B scores an equalizer (1-1)
  await request(`/rooms/${fbCode}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_fb', team: 'teamB', action: { type: 'FOOTBALL_GOAL' } }),
  });

  // End 2nd half with scores level (1-1) -> golden goal rule applies!
  const endHalf2 = await request(`/rooms/${fbCode}/clock`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_fa', action: 'end_half' }),
  });
  assert(endHalf2.data.room?.phase === 'extra_time', 'Score 1-1 at full time with golden_goal -> Phase is extra_time');

  // Golden Goal: Team A scores in extra time -> should end match immediately!
  const goldenGoal = await request(`/rooms/${fbCode}/score`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_fa', team: 'teamA', action: { type: 'FOOTBALL_GOAL' } }),
  });
  assert(goldenGoal.data.room?.phase === 'finished', 'Golden goal immediately finished match');
  assert(goldenGoal.data.room?.result?.winner === 'teamA', 'Winner is teamA');
  assert(goldenGoal.data.room?.result?.resultText?.includes('Golden Goal'), `Result text contains Golden Goal: "${goldenGoal.data.room?.result?.resultText}"`);

  // =========================================================================
  // TEST 4: FOOTBALL MERCY RULE
  // =========================================================================
  console.log('\n--- Test 4: Football Mercy Rule ---');

  const mercyRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      sport: 'football',
      teamAName: 'Eagles',
      teamBName: 'Hawks',
      rules: { mercyGoalLead: 3 },
    }),
  });
  const mCode = mercyRes.data.code;
  await request(`/rooms/${mCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'A', deviceId: 'dev_ma' }) });
  await request(`/rooms/${mCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'B', deviceId: 'dev_mb' }) });
  await request(`/rooms/${mCode}/toss`, { method: 'POST', body: JSON.stringify({ deviceId: 'dev_ma' }) });
  await new Promise((r) => setTimeout(r, 1200));
  const mAfterToss = await request(`/rooms/${mCode}`);
  const mWinDev = mAfterToss.data.tossWinner === 'teamA' ? 'dev_ma' : 'dev_mb';
  await request(`/rooms/${mCode}/toss-choice`, { method: 'POST', body: JSON.stringify({ deviceId: mWinDev, choice: 'kickoff' }) });

  // Score 3 unanswered goals for Team A
  await request(`/rooms/${mCode}/score`, { method: 'POST', body: JSON.stringify({ deviceId: 'dev_ma', team: 'teamA', action: { type: 'FOOTBALL_GOAL' } }) });
  await request(`/rooms/${mCode}/score`, { method: 'POST', body: JSON.stringify({ deviceId: 'dev_ma', team: 'teamA', action: { type: 'FOOTBALL_GOAL' } }) });
  const thirdGoal = await request(`/rooms/${mCode}/score`, { method: 'POST', body: JSON.stringify({ deviceId: 'dev_ma', team: 'teamA', action: { type: 'FOOTBALL_GOAL' } }) });

  assert(thirdGoal.data.room?.phase === 'finished', 'Mercy rule triggered after 3-goal lead -> finished');
  assert(thirdGoal.data.room?.result?.endedReason === 'mercy_rule', 'endedReason is mercy_rule');
  assert(thirdGoal.data.room?.result?.resultText?.includes('Mercy Rule'), `Result text contains Mercy Rule: "${thirdGoal.data.room?.result?.resultText}"`);

  // =========================================================================
  // TEST 5: HOST EARLY END
  // =========================================================================
  console.log('\n--- Test 5: Host Early Match End ---');

  const earlyRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      sport: 'cricket',
      teamAName: 'Lions',
      teamBName: 'Tigers',
      hostDeviceId: 'host_999',
    }),
  });
  const eCode = earlyRes.data.code;
  await request(`/rooms/${eCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'A', deviceId: 'host_999' }) });
  await request(`/rooms/${eCode}/claim`, { method: 'POST', body: JSON.stringify({ team: 'B', deviceId: 'guest_888' }) });
  await request(`/rooms/${eCode}/toss`, { method: 'POST', body: JSON.stringify({ deviceId: 'host_999' }) });
  await new Promise((r) => setTimeout(r, 1200));
  const eRoom = await request(`/rooms/${eCode}`);
  const eWinDev = eRoom.data.tossWinner === 'teamA' ? 'host_999' : 'guest_888';
  await request(`/rooms/${eCode}/toss-choice`, { method: 'POST', body: JSON.stringify({ deviceId: eWinDev, choice: 'bat' }) });

  // Non-host attempts to end
  const nonHostEnd = await request(`/rooms/${eCode}/end`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'intruder_000', reason: 'Rain' }),
  });
  assert(nonHostEnd.status === 403, 'Non-host rejected from ending early (403)');

  // Host ends early
  const hostEnd = await request(`/rooms/${eCode}/end`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'host_999', reason: 'Heavy rain interrupted play' }),
  });
  assert(hostEnd.data.room?.phase === 'finished', 'Host early end successfully finished match');
  assert(hostEnd.data.room?.result?.endedReason === 'host_ended', 'endedReason is host_ended');
  assert(hostEnd.data.room?.result?.resultText?.includes('Heavy rain'), `Result text records reason: "${hostEnd.data.room?.result?.resultText}"`);

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} / ${total} tests passed!`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
