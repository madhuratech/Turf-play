export interface CommentaryParams {
  sport: 'cricket' | 'football';
  teamName: string;
  batterName?: string | null;
  bowlerName?: string | null;
  fielderName?: string | null;
  runsOffBat?: number;
  extraType?: string;
  extraRuns?: number;
  isWicket?: boolean;
  wicketType?: string | null;
  batterRuns?: number;
  batterBalls?: number;
  // Football
  scorerName?: string | null;
  assistName?: string | null;
  goalType?: string;
  minute?: number;
}

export function generateCricketCommentary(params: CommentaryParams): {
  text: string;
  kind:
    | 'dot'
    | 'single'
    | 'two'
    | 'three'
    | 'four'
    | 'six'
    | 'wicket'
    | 'wide'
    | 'no_ball'
    | 'bye'
    | 'leg_bye';
} {
  const batter = params.batterName || params.teamName;
  const bowler = params.bowlerName || 'Bowler';
  const fielder = params.fielderName;

  if (params.isWicket) {
    const wType = params.wicketType || 'out';
    const scoreSnippet =
      params.batterRuns != null && params.batterBalls != null
        ? ` departs for ${params.batterRuns} (${params.batterBalls})`
        : ' is out';

    let desc = `OUT! ${wType.toUpperCase()} — ${batter}${scoreSnippet}`;
    if (wType === 'caught') {
      desc = fielder
        ? `OUT! Caught by ${fielder} off ${bowler} — ${batter}${scoreSnippet}`
        : `OUT! Caught — ${batter}${scoreSnippet}`;
    } else if (wType === 'bowled') {
      desc = `OUT! Bowled! ${bowler} breaks the stumps — ${batter}${scoreSnippet}`;
    } else if (wType === 'lbw') {
      desc = `OUT! LBW — ${batter}${scoreSnippet}`;
    } else if (wType === 'run_out') {
      desc = fielder
        ? `OUT! Run Out by ${fielder}! — ${batter}${scoreSnippet}`
        : `OUT! Run Out! — ${batter}${scoreSnippet}`;
    } else if (wType === 'stumped') {
      desc = fielder
        ? `OUT! Stumped by ${fielder} off ${bowler} — ${batter}${scoreSnippet}`
        : `OUT! Stumped — ${batter}${scoreSnippet}`;
    }

    return { text: desc, kind: 'wicket' };
  }

  if (params.extraType === 'wide') {
    const extra = params.extraRuns || 1;
    return {
      text: extra > 1 ? `Wide ball from ${bowler}, +${extra} runs` : `Wide ball from ${bowler}, +1`,
      kind: 'wide',
    };
  }

  if (params.extraType === 'no_ball') {
    const total = (params.runsOffBat || 0) + (params.extraRuns || 1);
    return {
      text: `No ball from ${bowler}! Free hit next. +${total}`,
      kind: 'no_ball',
    };
  }

  if (params.extraType === 'bye') {
    return {
      text: `Bye, +${params.extraRuns || 1}`,
      kind: 'bye',
    };
  }

  if (params.extraType === 'leg_bye') {
    return {
      text: `Leg bye, +${params.extraRuns || 1}`,
      kind: 'leg_bye',
    };
  }

  const runs = params.runsOffBat || 0;

  if (runs === 0) {
    return {
      text: `${bowler} bowls a tidy dot ball to ${batter}`,
      kind: 'dot',
    };
  }

  if (runs === 1) {
    return {
      text: `${batter} punches into the gap for a single`,
      kind: 'single',
    };
  }

  if (runs === 2) {
    return {
      text: `${batter} comes back hard for a couple of runs`,
      kind: 'two',
    };
  }

  if (runs === 3) {
    return {
      text: `Terrific running! ${batter} hustles for three runs`,
      kind: 'three',
    };
  }

  if (runs === 4) {
    return {
      text: `${batter} drives through the ropes for FOUR!`,
      kind: 'four',
    };
  }

  if (runs === 6) {
    return {
      text: `${batter} launches it into the night sky for a massive SIX!`,
      kind: 'six',
    };
  }

  return {
    text: `${batter} scores ${runs} runs`,
    kind: 'single',
  };
}

export function generateFootballCommentary(params: CommentaryParams): {
  text: string;
  kind: 'goal' | 'penalty' | 'own_goal';
} {
  const scorer = params.scorerName || params.teamName;
  const assist = params.assistName;
  const minute = params.minute != null ? ` (${params.minute}')` : '';

  if (params.goalType === 'penalty') {
    return {
      text: `PENALTY GOAL! ${scorer} calmly slots it home!${minute}`,
      kind: 'penalty',
    };
  }

  if (params.goalType === 'own_goal') {
    return {
      text: `OWN GOAL! Unfortunate deflection into the net${minute}`,
      kind: 'own_goal',
    };
  }

  if (assist) {
    return {
      text: `GOAL! ${scorer} finds the net, assisted by ${assist}!${minute}`,
      kind: 'goal',
    };
  }

  return {
    text: `GOAL! ${scorer} strikes into the back of the net!${minute}`,
    kind: 'goal',
  };
}
