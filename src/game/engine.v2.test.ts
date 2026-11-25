import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, REVIEWER1_CONFIG } from './config';
import { REVIEWER1_PROFILE, REVIEWER2_PROFILE } from './reviewers';
import {
  createGame,
  declarePlay,
  endTurn,
  getCost,
  makeContext,
  respondToPlay,
  canChallenge,
  totalShield,
  totalPermanentShield,
  totalTemporaryShield,
  drawCards,
  deadlineOutcome,
} from './engine';
import { buildChallengeView, buildReviewerView, decideReviewerAction, decideReviewerChallenge } from './ai';
import { seededRng, type Rng } from './rng';
import { BASIC_CLAIM_POOL, ADVANCED_CARD_IDS } from './cards';
import type { CardId, GameState, Side } from './types';

function setup(seed = 1) {
  const ctx = makeContext(REVIEWER1_CONFIG, seededRng(seed));
  const state = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
  return { ctx, state };
}

let uid = 0;
function giveHand(state: GameState, side: Side, ids: CardId[]): string[] {
  const c = state[side];
  c.hand = ids.map((cardId) => ({ instanceId: `T-${side}-${uid++}`, cardId }));
  return c.hand.map((h) => h.instanceId);
}

function play(
  state: GameState,
  side: Side,
  instanceId: string,
  declared: CardId,
  challenge: boolean,
  ctx: ReturnType<typeof makeContext>,
): GameState {
  const d = declarePlay(state, side, instanceId, declared, ctx);
  expect(d.ok).toBe(true);
  const r = respondToPlay(d.state, challenge, ctx);
  expect(r.ok).toBe(true);
  return r.state;
}

describe('Test 1 — Per-card cost escalation', () => {
  it('using Revision raises only Revision cost', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    const ids = giveHand(s, 'player', ['revision', 'investigation', 'additional_experiment']);

    expect(getCost(s.player, 'revision', ctx)).toBe(1);
    s = play(s, 'player', ids[0], 'revision', false, ctx);

    expect(getCost(s.player, 'revision', ctx)).toBe(2);
    expect(getCost(s.player, 'investigation', ctx)).toBe(1);
    expect(getCost(s.player, 'additional_experiment', ctx)).toBe(1);
    expect(getCost(s.player, 'argument', ctx)).toBe(1);
  });

  it('costs reset at own turn start, not opponent turn', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    const ids = giveHand(s, 'player', ['revision']);
    s = play(s, 'player', ids[0], 'revision', false, ctx);
    expect(getCost(s.player, 'revision', ctx)).toBe(2);

    s = endTurn(s, 'player', ctx).state;
    expect(getCost(s.player, 'revision', ctx)).toBe(2);

    s = endTurn(s, 'reviewer', ctx).state;
    expect(getCost(s.player, 'revision', ctx)).toBe(1);
  });

  it('cannot declare a card whose cost exceeds available AP', () => {
    const { ctx, state } = setup();
    state.player.ap = 1;
    state.player.cardUsage.revision = 1;
    const ids = giveHand(state, 'player', ['argument']);
    expect(declarePlay(state, 'player', ids[0], 'revision', ctx).ok).toBe(false);
    expect(declarePlay(state, 'player', ids[0], 'argument', ctx).ok).toBe(true);
  });
});

describe('Test 2 — Bluff cost settlement', () => {
  it('FinalCost = max(declared, actual) + 1, both counters increase, debt applies', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 3;
    s.player.cardUsage.argument = 2;
    s.reviewer.ap = 5;

    const ids = giveHand(s, 'player', ['argument']);
    expect(getCost(s.player, 'argument', ctx)).toBe(3);
    expect(getCost(s.player, 'revision', ctx)).toBe(1);

    s = play(s, 'player', ids[0], 'revision', true, ctx);

    expect(s.lastResolution?.outcome).toBe('challenge_success');
    expect(s.lastResolution?.extraCost).toBe(3);
    expect(s.player.ap).toBe(0);
    expect(s.player.apDebt).toBe(1);
    expect(s.player.cardUsage.argument).toBe(3);
    expect(s.player.cardUsage.revision).toBe(1);
    expect(s.reviewer.hp).toBe(4);
  });

  it('caught bluff raises the usage count of both the declared and the actual card', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    s.reviewer.ap = 5;
    const ids = giveHand(s, 'player', ['evidence']);
    s = play(s, 'player', ids[0], 'strong_evidence', true, ctx);
    expect(s.lastResolution?.outcome).toBe('challenge_success');
    expect(s.player.cardUsage.strong_evidence).toBe(1);
    expect(s.player.cardUsage.evidence).toBe(1);
    expect(getCost(s.player, 'evidence', ctx)).toBe(2);
    expect(getCost(s.player, 'strong_evidence', ctx)).toBe(2);
  });

  it('truthful bluff-catch penalty does not apply when declared equals actual', () => {
    const { ctx, state } = setup();
    state.reviewer.ap = 5;
    const ids = giveHand(state, 'player', ['argument']);
    const s = play(state, 'player', ids[0], 'argument', true, ctx);
    expect(s.lastResolution?.outcome).toBe('challenge_failed');
    expect(s.player.ap).toBe(2);
    expect(s.reviewer.ap).toBe(4);
  });
});

describe('Test 3 — Resource loop bounded', () => {
  it('Revision cannot generate infinite AP', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    const ids = giveHand(s, 'player', ['revision', 'revision', 'revision', 'revision', 'revision']);
    const costs: number[] = [];
    for (const id of ids) {
      const cost = getCost(s.player, 'revision', ctx);
      if (s.player.ap < cost) break;
      costs.push(cost);
      s = play(s, 'player', id, 'revision', false, ctx);
      expect(s.player.ap).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAp);
    }
    expect(costs[0]).toBe(1);
    expect(costs[1]).toBe(2);
    expect(costs.length).toBeLessThan(5);
  });
});

describe('Test 4 — Claim pool', () => {
  it('advanced cards cannot be declared before unlock', () => {
    const { ctx, state } = setup();
    expect(state.player.claimPool).toEqual(BASIC_CLAIM_POOL);
    for (const adv of ADVANCED_CARD_IDS) {
      expect(state.player.claimPool).not.toContain(adv);
    }
    state.player.ap = 5;
    const ids = giveHand(state, 'player', ['argument']);
    expect(declarePlay(state, 'player', ids[0], 'counterargument', ctx).ok).toBe(false);
    expect(declarePlay(state, 'player', ids[0], 'argument', ctx).ok).toBe(true);
  });

  it('reviewer claim pools differ between reviewers', () => {
    expect(REVIEWER1_PROFILE.claimPool).toContain('prior_work');
    expect(REVIEWER1_PROFILE.claimPool).toContain('cross_check');
    expect(REVIEWER1_PROFILE.claimPool).not.toContain('red_herring');
    expect(REVIEWER2_PROFILE.claimPool).toContain('red_herring');
    expect(REVIEWER2_PROFILE.claimPool).toContain('counterargument');
    expect(REVIEWER2_PROFILE.claimPool).not.toContain('prior_work');
  });
});

describe('Test 5 — Counterargument', () => {
  it('deals 1 damage when opponent has not failed a challenge this turn', () => {
    const { ctx, state } = setup();
    state.player.claimPool = [...BASIC_CLAIM_POOL, 'counterargument'];
    const ids = giveHand(state, 'player', ['counterargument']);
    const s = play(state, 'player', ids[0], 'counterargument', false, ctx);
    expect(s.reviewer.hp).toBe(4);
  });

  it('deals 2 damage when the opponent already failed a challenge this turn', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.claimPool = [...BASIC_CLAIM_POOL, 'counterargument'];
    s.player.ap = 5;
    s.reviewer.ap = 5;

    const honest = giveHand(s, 'player', ['argument']);
    s = play(s, 'player', honest[0], 'argument', true, ctx);
    expect(s.lastResolution?.outcome).toBe('challenge_failed');
    expect(s.reviewer.failedChallengesThisTurn).toBe(1);
    expect(s.reviewer.hp).toBe(4);

    s.player.cardUsage = {};
    const ca = giveHand(s, 'player', ['counterargument']);
    s = play(s, 'player', ca[0], 'counterargument', false, ctx);
    expect(s.reviewer.hp).toBe(2);
  });

  it('does not count the challenge failure caused by this very play', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.claimPool = [...BASIC_CLAIM_POOL, 'counterargument'];
    s.player.ap = 5;
    s.reviewer.ap = 5;

    const ids = giveHand(s, 'player', ['evidence']);
    s = play(s, 'player', ids[0], 'counterargument', true, ctx);
    expect(s.lastResolution?.outcome).toBe('challenge_success');
    expect(s.reviewer.hp).toBe(5);
    expect(totalTemporaryShield(s.player)).toBe(1);
  });

  it('bonus damage is absorbed by shields', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.claimPool = [...BASIC_CLAIM_POOL, 'counterargument'];
    s.player.ap = 5;
    s.reviewer.ap = 5;
    s.reviewer.failedChallengesThisTurn = 1;
    s.reviewer.shields = [{ id: 'x', amount: 2, kind: 'temporary', expires: 'owner_turn_start' }];
    const ids = giveHand(s, 'player', ['counterargument']);
    s = play(s, 'player', ids[0], 'counterargument', false, ctx);
    expect(s.reviewer.hp).toBe(5);
    expect(totalShield(s.reviewer)).toBe(0);
  });

  it('failed challenge counter resets on a new turn', () => {
    const { ctx, state } = setup();
    let s = state;
    s.reviewer.failedChallengesThisTurn = 2;
    s = endTurn(s, 'player', ctx).state;
    expect(s.reviewer.failedChallengesThisTurn).toBe(0);
  });
});

describe('Test 6 — Red Herring', () => {
  function withRedHerring(seed = 1) {
    const { ctx, state } = setup(seed);
    state.player.claimPool = [...BASIC_CLAIM_POOL, 'red_herring'];
    state.player.ap = 5;
    state.reviewer.ap = 5;
    return { ctx, state };
  }

  it('truthful declaration deals 1 damage', () => {
    const { ctx, state } = withRedHerring();
    const ids = giveHand(state, 'player', ['red_herring']);
    const s = play(state, 'player', ids[0], 'red_herring', false, ctx);
    expect(s.reviewer.hp).toBe(4);
  });

  it('bluff caught with Red Herring as actual card deals 2 damage', () => {
    const { ctx, state } = withRedHerring();
    const ids = giveHand(state, 'player', ['red_herring']);
    const s = play(state, 'player', ids[0], 'revision', true, ctx);
    expect(s.lastResolution?.outcome).toBe('challenge_success');
    expect(s.reviewer.hp).toBe(3);
  });

  it('bluff accepted executes the declared card instead', () => {
    const { ctx, state } = withRedHerring();
    const ids = giveHand(state, 'player', ['red_herring']);
    const s = play(state, 'player', ids[0], 'revision', false, ctx);
    expect(s.reviewer.hp).toBe(5);
    expect(s.player.ap).toBeGreaterThanOrEqual(5);
  });

  it('another card bluffed as Red Herring deals 1 damage when accepted', () => {
    const { ctx, state } = withRedHerring();
    const ids = giveHand(state, 'player', ['evidence']);
    const s = play(state, 'player', ids[0], 'red_herring', false, ctx);
    expect(s.reviewer.hp).toBe(4);
    expect(totalTemporaryShield(s.player)).toBe(0);
  });
});

describe('Test 7 — Permanent shield', () => {
  function withPriorWork() {
    const { ctx, state } = setup();
    state.player.claimPool = [...BASIC_CLAIM_POOL, 'prior_work'];
    state.player.ap = 5;
    return { ctx, state };
  }

  it('normal damage consumes temporary shield first, then permanent', () => {
    const { ctx, state } = withPriorWork();
    let s = state;
    const ids = giveHand(s, 'player', ['prior_work', 'evidence']);
    s = play(s, 'player', ids[0], 'prior_work', false, ctx);
    expect(totalPermanentShield(s.player)).toBe(1);
    s = play(s, 'player', ids[1], 'evidence', false, ctx);
    expect(totalTemporaryShield(s.player)).toBe(1);

    s = endTurn(s, 'player', ctx).state;
    const rHand = giveHand(s, 'reviewer', ['argument', 'argument']);
    s = play(s, 'reviewer', rHand[0], 'argument', false, ctx);
    expect(totalTemporaryShield(s.player)).toBe(0);
    expect(totalPermanentShield(s.player)).toBe(1);
    s = play(s, 'reviewer', rHand[1], 'argument', false, ctx);
    expect(totalPermanentShield(s.player)).toBe(0);
    expect(s.player.hp).toBe(5);
  });

  it('temporary shield clears at own turn start but permanent does not', () => {
    const { ctx, state } = withPriorWork();
    let s = state;
    const ids = giveHand(s, 'player', ['prior_work', 'evidence']);
    s = play(s, 'player', ids[0], 'prior_work', false, ctx);
    s = play(s, 'player', ids[1], 'evidence', false, ctx);
    expect(totalTemporaryShield(s.player)).toBe(1);

    s = endTurn(s, 'player', ctx).state;
    s = endTurn(s, 'reviewer', ctx).state;
    expect(totalTemporaryShield(s.player)).toBe(0);
    expect(totalPermanentShield(s.player)).toBe(1);
  });

  it('pierce damage consumes neither shield', () => {
    const { ctx, state } = withPriorWork();
    let s = state;
    const ids = giveHand(s, 'player', ['prior_work']);
    s = play(s, 'player', ids[0], 'prior_work', false, ctx);
    s = endTurn(s, 'player', ctx).state;
    const rHand = giveHand(s, 'reviewer', ['critical_point']);
    s = play(s, 'reviewer', rHand[0], 'critical_point', false, ctx);
    expect(totalPermanentShield(s.player)).toBe(1);
    expect(s.player.hp).toBe(4);
  });
});

describe('Test 8 — Cross-check', () => {
  it('reveals category only, never the card id', () => {
    const { ctx, state } = setup();
    state.reviewer.crossCheckCharges = 1;
    const ids = giveHand(state, 'player', ['investigation']);
    const d = declarePlay(state, 'player', ids[0], 'critical_point', ctx);
    expect(d.ok).toBe(true);
    const view = buildChallengeView(d.state)!;
    expect(view.crossCheckRevealedCategory).toBe('utility');
    expect(JSON.stringify(view)).not.toContain('investigation');
    expect(JSON.stringify(view)).not.toContain(ids[0]);
    expect(d.state.reviewer.crossCheckCharges).toBe(0);
  });

  it('one charge consumed per opponent play, and charges stack', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    s.player.claimPool = [...BASIC_CLAIM_POOL, 'cross_check'];
    s.reviewer.crossCheckCharges = 2;

    const ids = giveHand(s, 'player', ['cross_check']);
    s = play(s, 'player', ids[0], 'cross_check', false, ctx);
    expect(s.player.crossCheckCharges).toBe(1);

    s = endTurn(s, 'player', ctx).state;
    const rHand = giveHand(s, 'reviewer', ['evidence']);
    const d = declarePlay(s, 'reviewer', rHand[0], 'evidence', ctx);
    expect(d.state.player.crossCheckCharges).toBe(0);
    expect(d.state.pendingPlay?.crossCheckRevealedCategory).toBe('defense');
  });

  it('accept consumes the charge just like challenge', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.crossCheckCharges = 1;
    const ids = giveHand(s, 'player', ['evidence']);
    const d = declarePlay(s, 'player', ids[0], 'evidence', ctx);
    s = respondToPlay(d.state, false, ctx).state;
    expect(s.reviewer.crossCheckCharges).toBe(0);
  });

  it('AI challenges for sure when Cross-check reveals a category mismatch', () => {
    const { ctx, state } = setup(7);
    state.reviewer.crossCheckCharges = 1;
    state.reviewer.ap = 3;
    state.suspicion = 0;
    const ids = giveHand(state, 'player', ['investigation']);
    const d = declarePlay(state, 'player', ids[0], 'critical_point', ctx);
    const view = buildChallengeView(d.state)!;
    expect(view.crossCheckRevealedCategory).toBe('utility');
    for (let i = 0; i < 30; i++) {
      expect(decideReviewerChallenge(view, ctx)).toBe(true);
    }
  });
});

describe('Test 9 — Burden of Proof', () => {
  function withBurden() {
    const { ctx, state } = setup();
    state.player.claimPool = [...BASIC_CLAIM_POOL, 'burden_of_proof'];
    state.player.ap = 5;
    return { ctx, state };
  }

  it('grants a free challenge at 0 AP that costs nothing when it fails', () => {
    const { ctx, state } = withBurden();
    let s = state;
    const ids = giveHand(s, 'player', ['burden_of_proof']);
    s = play(s, 'player', ids[0], 'burden_of_proof', false, ctx);
    expect(s.player.burdenOfProofActive).toBe(true);

    s = endTurn(s, 'player', ctx).state;
    s.player.ap = 0;
    s.player.apDebt = 0;
    const rHand = giveHand(s, 'reviewer', ['evidence']);
    const d = declarePlay(s, 'reviewer', rHand[0], 'evidence', ctx);
    const r = respondToPlay(d.state, true, ctx);
    expect(r.ok).toBe(true);
    expect(r.state.lastResolution?.outcome).toBe('challenge_failed');
    expect(r.state.lastResolution?.usedBurdenOfProof).toBe(true);
    expect(r.state.player.ap).toBe(0);
    expect(r.state.player.apDebt).toBe(0);
    expect(r.state.player.burdenOfProofActive).toBe(false);
  });

  it('successful special challenge grants 2 AP', () => {
    const { ctx, state } = withBurden();
    let s = state;
    const ids = giveHand(s, 'player', ['burden_of_proof']);
    s = play(s, 'player', ids[0], 'burden_of_proof', false, ctx);
    s = endTurn(s, 'player', ctx).state;
    s.player.ap = 0;
    const rHand = giveHand(s, 'reviewer', ['argument']);
    const d = declarePlay(s, 'reviewer', rHand[0], 'critical_point', ctx);
    const r = respondToPlay(d.state, true, ctx);
    expect(r.state.lastResolution?.outcome).toBe('challenge_success');
    expect(r.state.player.ap).toBe(2);
  });

  it('does not stack, and expires at opponent turn end', () => {
    const { ctx, state } = withBurden();
    let s = state;
    s.player.ap = 5;
    const ids = giveHand(s, 'player', ['burden_of_proof', 'burden_of_proof']);
    s = play(s, 'player', ids[0], 'burden_of_proof', false, ctx);
    s = play(s, 'player', ids[1], 'burden_of_proof', false, ctx);
    expect(s.player.burdenOfProofActive).toBe(true);

    s = endTurn(s, 'player', ctx).state;
    expect(s.player.burdenOfProofActive).toBe(true);
    s = endTurn(s, 'reviewer', ctx).state;
    expect(s.player.burdenOfProofActive).toBe(false);
  });

  it('Accept does not consume the special challenge', () => {
    const { ctx, state } = withBurden();
    let s = state;
    const ids = giveHand(s, 'player', ['burden_of_proof']);
    s = play(s, 'player', ids[0], 'burden_of_proof', false, ctx);
    s = endTurn(s, 'player', ctx).state;
    s.player.ap = 0;
    const rHand = giveHand(s, 'reviewer', ['evidence']);
    const d = declarePlay(s, 'reviewer', rHand[0], 'evidence', ctx);
    s = respondToPlay(d.state, false, ctx).state;
    expect(s.player.burdenOfProofActive).toBe(true);
  });

  it('AI recognises a 0 AP player holding Burden of Proof', () => {
    const { ctx, state } = setup();
    let s = state;
    s = endTurn(s, 'player', ctx).state;
    s.player.ap = 0;
    s.player.burdenOfProofActive = true;
    const rHand = giveHand(s, 'reviewer', ['evidence']);
    const d = declarePlay(s, 'reviewer', rHand[0], 'evidence', ctx);
    expect(d.ok).toBe(true);
    expect(respondToPlay(d.state, true, ctx).ok).toBe(true);
  });
});

describe('Test 10 — Reviewer AI', () => {
  it('AI never declares an advanced card it has not unlocked', () => {
    const ctx = makeContext(REVIEWER1_CONFIG, seededRng(11));
    let s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
    expect(s.reviewer.claimPool).toContain('prior_work');
    expect(s.reviewer.claimPool).not.toContain('red_herring');

    let guard = 0;
    while (s.phase !== 'game_over' && guard++ < 500) {
      if (s.phase === 'reviewer_turn') {
        const a = decideReviewerAction(buildReviewerView(s, ctx), ctx);
        if (a.type === 'end') {
          s = endTurn(s, 'reviewer', ctx).state;
        } else {
          expect(s.reviewer.claimPool).toContain(a.declaredCardId);
          const d = declarePlay(s, 'reviewer', a.instanceId, a.declaredCardId, ctx);
          expect(d.ok).toBe(true);
          s = respondToPlay(d.state, false, ctx).state;
        }
      } else {
        s = endTurn(s, 'player', ctx).state;
      }
    }
  });

  it('reviewer decision view never exposes player hand card ids', () => {
    const { ctx, state } = setup();
    const s = endTurn(state, 'player', ctx).state;
    giveHand(s, 'player', ['investigation', 'red_herring']);
    const view = buildReviewerView(s, ctx);
    expect(JSON.stringify(view.opponent)).not.toContain('investigation');
    expect(JSON.stringify(view.opponent)).not.toContain('red_herring');
    expect(view.opponent.handCount).toBe(2);
  });

  it('the two reviewers show distinct bluff/challenge tendencies over many seeds', () => {
    function simulate(profile: typeof REVIEWER1_PROFILE) {
      let bluffs = 0;
      let plays = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const ctx = makeContext(profile.gameConfig, seededRng(seed));
        let s = createGame(ctx, { reviewerProfile: profile });
        let guard = 0;
        while (s.phase !== 'game_over' && guard++ < 300) {
          if (s.phase === 'reviewer_turn') {
            const a = decideReviewerAction(buildReviewerView(s, ctx), ctx);
            if (a.type === 'end') {
              s = endTurn(s, 'reviewer', ctx).state;
            } else {
              plays++;
              if (a.bluff) bluffs++;
              const d = declarePlay(s, 'reviewer', a.instanceId, a.declaredCardId, ctx);
              if (!d.ok) break;
              s = respondToPlay(d.state, false, ctx).state;
            }
          } else {
            s = endTurn(s, 'player', ctx).state;
          }
        }
      }
      return plays === 0 ? 0 : bluffs / plays;
    }
    const skeptic = simulate(REVIEWER1_PROFILE);
    const aggressor = simulate(REVIEWER2_PROFILE);
    expect(aggressor).toBeGreaterThan(skeptic);
  });

  it('configs match the design document', () => {
    expect(REVIEWER1_CONFIG.reviewerHp).toBe(5);
    expect(DEFAULT_CONFIG.reviewerHp).toBe(6);
    expect(REVIEWER1_CONFIG.suspicion.initial).toBe(3);
    expect(DEFAULT_CONFIG.suspicion.initial).toBe(2);
    expect(REVIEWER1_CONFIG.aiBluff.otherwise).toBeCloseTo(0.15);
    expect(DEFAULT_CONFIG.aiBluff.otherwise).toBeCloseTo(0.4);
    expect(REVIEWER1_CONFIG.aiBluff.whenPlayerApZero).toBeCloseTo(0.4);
    expect(DEFAULT_CONFIG.aiBluff.whenPlayerApZero).toBeCloseTo(0.8);
    expect(REVIEWER1_CONFIG.attackWeight).toBeLessThan(DEFAULT_CONFIG.attackWeight);
    expect(REVIEWER1_CONFIG.defenseWeight).toBeGreaterThan(DEFAULT_CONFIG.defenseWeight);
  });
});

describe('Test 12 — Battle state carryover shape', () => {
  it('temporary combat state is not inherited by a fresh battle', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(3));
    const first = createGame(ctx, {
      reviewerProfile: REVIEWER1_PROFILE,
      playerHp: 3,
      playerMaxHp: 5,
    });
    expect(first.player.hp).toBe(3);
    expect(first.player.apDebt).toBe(0);
    expect(first.player.shields).toHaveLength(0);
    expect(first.player.crossCheckCharges).toBe(0);
    expect(first.player.burdenOfProofActive).toBe(false);
    expect(first.player.cardUsage).toEqual({});
    expect(first.round).toBe(1);

    const second = createGame(ctx, { reviewerProfile: REVIEWER2_PROFILE, playerHp: 3, playerMaxHp: 5 });
    expect(second.player.hp).toBe(3);
    expect(second.reviewer.hp).toBe(6);
    expect(second.player.discard).toHaveLength(0);
    expect(second.player.hand).toHaveLength(DEFAULT_CONFIG.initialHandSize);
  });

  it('first round gives no AP recovery and no extra draw', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(3));
    const s = createGame(ctx);
    expect(s.player.ap).toBe(DEFAULT_CONFIG.initialAp);
    expect(s.player.hand.length).toBe(DEFAULT_CONFIG.initialHandSize);
    expect(s.reviewer.ap).toBe(DEFAULT_CONFIG.initialAp);
    expect(s.reviewer.hand.length).toBe(DEFAULT_CONFIG.initialHandSize);
  });

  it('reviewer turn after a player-turn challenge keeps modified AP', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    const ids = giveHand(s, 'player', ['evidence']);
    s = play(s, 'player', ids[0], 'critical_point', true, ctx);
    expect(s.reviewer.ap).toBe(4);
    s = endTurn(s, 'player', ctx).state;
    expect(s.reviewer.ap).toBe(4);
  });
});

describe('Deadline outcome', () => {
  it('compares HP after six rounds', () => {
    expect(deadlineOutcome(4, 3).outcome).toBe('accept');
    expect(deadlineOutcome(3, 3).outcome).toBe('weak_accept');
    expect(deadlineOutcome(2, 4).outcome).toBe('reject');
  });
});

describe('Card conservation and deck size', () => {
  it('player starting deck is 10 basic cards', () => {
    const { state } = setup();
    const total = state.player.hand.length + state.player.deck.length + state.player.discard.length;
    expect(total).toBe(10);
  });

  it('draw respects hand limit and reshuffles discard without losing cards', () => {
    const { ctx, state } = setup();
    const c = state.player;
    const total = c.hand.length + c.deck.length + c.discard.length;
    c.discard.push(...c.deck.splice(0, c.deck.length - 1));
    const n = drawCards(c, 5, ctx);
    expect(c.hand.length).toBeLessThanOrEqual(DEFAULT_CONFIG.handLimit);
    expect(n).toBeGreaterThan(0);
    expect(c.hand.length + c.deck.length + c.discard.length).toBe(total);
    const ids = new Set([...c.hand, ...c.deck, ...c.discard].map((x) => x.instanceId));
    expect(ids.size).toBe(total);
  });

  it('drawing from completely empty pools returns 0', () => {
    const { ctx, state } = setup();
    state.player.hand = [];
    state.player.deck = [];
    state.player.discard = [];
    expect(drawCards(state.player, 2, ctx)).toBe(0);
  });
});

describe('Double settlement protection', () => {
  it('a resolved play cannot be resolved twice', () => {
    const { ctx, state } = setup();
    const ids = giveHand(state, 'player', ['argument']);
    const d = declarePlay(state, 'player', ids[0], 'argument', ctx);
    expect(declarePlay(d.state, 'player', ids[0], 'argument', ctx).ok).toBe(false);
    const r1 = respondToPlay(d.state, false, ctx);
    const r2 = respondToPlay(r1.state, false, ctx);
    expect(r2.ok).toBe(false);
    expect(r1.state.reviewer.hp).toBe(4);
  });

  it('Investigation on an empty hand completes normally', () => {
    const { ctx, state } = setup();
    state.reviewer.hand = [];
    const ids = giveHand(state, 'player', ['investigation']);
    const s = play(state, 'player', ids[0], 'investigation', false, ctx);
    expect(s.lastResolution?.peekedCardId).toBeNull();
    expect(s.phase).toBe('player_turn');
  });
});

describe('Full battle simulation — no deadlock, invariants hold', () => {
  function simulateBattle(seed: number, rng: Rng, profile: 'reviewer1' | 'reviewer2') {
    const prof = profile === 'reviewer1' ? REVIEWER1_PROFILE : REVIEWER2_PROFILE;
    const ctx = makeContext(prof.gameConfig, rng);
    let s = createGame(ctx, { reviewerProfile: prof });
    const playerDeckSize = s.player.hand.length + s.player.deck.length + s.player.discard.length;
    let guard = 0;
    while (s.phase !== 'game_over') {
      guard++;
      expect(guard).toBeLessThan(3000);
      if (s.phase === 'player_turn') {
        const c = s.player;
        const affordable = c.hand.filter((h) => c.claimPool.includes(h.cardId) && c.ap >= getCost(c, h.cardId, ctx));
        if (affordable.length && rng() < 0.85) {
          const pick = affordable[Math.floor(rng() * affordable.length)];
          const claimOptions = c.claimPool.filter((id) => c.ap >= getCost(c, id, ctx));
          const declared = rng() < 0.35 ? claimOptions[Math.floor(rng() * claimOptions.length)] : pick.cardId;
          const d = declarePlay(s, 'player', pick.instanceId, declared, ctx);
          if (!d.ok) {
            s = endTurn(s, 'player', ctx).state;
          } else {
            s = d.state;
            const view = buildChallengeView(s)!;
            s = respondToPlay(s, decideReviewerChallenge(view, ctx), ctx).state;
          }
        } else {
          s = endTurn(s, 'player', ctx).state;
        }
      } else if (s.phase === 'reviewer_turn') {
        const a = decideReviewerAction(buildReviewerView(s, ctx), ctx);
        if (a.type === 'end') {
          s = endTurn(s, 'reviewer', ctx).state;
        } else {
          const d = declarePlay(s, 'reviewer', a.instanceId, a.declaredCardId, ctx);
          if (!d.ok) {
            s = endTurn(s, 'reviewer', ctx).state;
          } else {
            s = d.state;
            const canChallengeNow = canChallenge(s.player, ctx);
            s = respondToPlay(s, canChallengeNow && rng() < 0.3, ctx).state;
          }
        }
      } else {
        throw new Error(`unexpected phase ${s.phase}`);
      }
      if (s.phase !== 'awaiting_player_challenge' && s.phase !== 'awaiting_reviewer_challenge') {
        expect(s.player.hand.length + s.player.deck.length + s.player.discard.length).toBe(playerDeckSize);
      }
      expect(s.player.hp).toBeGreaterThanOrEqual(0);
      expect(s.reviewer.hp).toBeGreaterThanOrEqual(0);
      expect(s.reviewer.ap).toBeLessThanOrEqual(ctx.config.maxAp);
      expect(s.suspicion).toBeGreaterThanOrEqual(0);
      expect(s.suspicion).toBeLessThanOrEqual(5);
      expect(s.round).toBeLessThanOrEqual(ctx.config.maxRounds);
    }
    expect(s.result).not.toBeNull();
    expect(s.player.hp).toBeLessThanOrEqual(s.player.maxHp);
    expect(seed).toBeGreaterThan(0);
    return s;
  }

  it('Reviewer #1 battles terminate for 100 seeds', () => {
    for (let seed = 1; seed <= 100; seed++) {
      simulateBattle(seed, seededRng(seed), 'reviewer1');
    }
  });

  it('Reviewer #2 battles terminate for 100 seeds', () => {
    for (let seed = 1; seed <= 100; seed++) {
      simulateBattle(seed, seededRng(seed), 'reviewer2');
    }
  });

  it('battles usually last more than two rounds', () => {
    let shortBattles = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = simulateBattle(seed, seededRng(seed), 'reviewer2');
      if (s.round <= 2) shortBattles++;
    }
    expect(shortBattles).toBeLessThan(20);
  });
});
