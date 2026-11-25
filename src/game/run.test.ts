import { describe, expect, it } from 'vitest';
import {
  addCardToRun,
  advanceNode,
  applyEventEffect,
  clearBattleModifiers,
  completeNode,
  createRunState,
  finishRewardStep,
  resolveBattleEnd,
  pickThreeRewardCards,
  pickTwoEvents,
  ALL_EVENT_IDS,
  PAPER_TYPES,
  RANDOM_EVENTS,
  toRenderOptions,
  type EventId,
  type PaperTypeId,
  type RunState,
} from './run';
import { seededRng } from './rng';
import { ADVANCED_CARD_IDS, BASIC_CLAIM_POOL, PLAYER_BASE_DECK } from './cards';
import type { CardId } from './types';
import { createGame, makeContext, declarePlay, endTurn, respondToPlay, getCost } from './engine';
import { buildReviewerView, decideReviewerAction } from './ai';
import { DEFAULT_CONFIG } from './config';
import { REVIEWER1_PROFILE, REVIEWER2_PROFILE } from './reviewers';

function deckSize(deck: Partial<Record<CardId, number>>): number {
  return Object.values(deck).reduce((a, b) => a + (b ?? 0), 0);
}

describe('Test 11 — Paper Types', () => {
  const expected: Record<PaperTypeId, CardId> = {
    theoretical: 'prior_work',
    empirical: 'cross_check',
    method: 'counterargument',
  };

  (Object.keys(expected) as PaperTypeId[]).forEach((typeId) => {
    it(`${typeId} adds the correct starting advanced card`, () => {
      const run = createRunState('male', typeId, seededRng(5));
      const card = expected[typeId];
      expect(run.deck[card]).toBe(1);
      expect(run.claimPool).toContain(card);
      expect(deckSize(run.deck)).toBe(11);
      expect(PAPER_TYPES[typeId].initialCard).toBe(card);
    });
  });

  it('starts with all seven basic cards in the claim pool', () => {
    const run = createRunState('female', 'theoretical', seededRng(9));
    for (const basic of BASIC_CLAIM_POOL) {
      expect(run.claimPool).toContain(basic);
    }
    expect(run.claimPool.length).toBe(BASIC_CLAIM_POOL.length + 1);
    expect(run.hp).toBe(5);
    expect(run.maxHp).toBe(5);
    expect(deckSize(run.deck)).toBe(deckSize(PLAYER_BASE_DECK) + 1);
  });

  it('the advanced card is not claimable before selection', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(2));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
    for (const adv of ADVANCED_CARD_IDS) {
      expect(s.player.claimPool).not.toContain(adv);
    }
  });
});

describe('Test 13 — Random events', () => {
  it('draws two distinct events per run', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const [a, b] = pickTwoEvents(seededRng(seed));
      expect(a).not.toBe(b);
      expect(ALL_EVENT_IDS).toContain(a);
      expect(ALL_EVENT_IDS).toContain(b);
    }
  });

  it('run contains two event nodes assigned up front, and node 2 is hidden as `?`', () => {
    const run = createRunState('male', 'empirical', seededRng(13));
    const eventNodes = run.nodes.filter((n) => n.type === 'event');
    expect(eventNodes).toHaveLength(2);
    expect(eventNodes[0].eventId).not.toBe(eventNodes[1].eventId);
    expect(run.nodes[2].status).toBe('locked');
    expect(run.nodes[3].status).toBe('locked');
  });

  it('all seven events exist with exactly two options and declared effects', () => {
    expect(Object.keys(RANDOM_EVENTS)).toHaveLength(7);
    for (const id of ALL_EVENT_IDS) {
      const ev = RANDOM_EVENTS[id];
      expect(ev.options).toHaveLength(2);
      expect(ev.name.length).toBeGreaterThan(3);
      expect(ev.description.length).toBeGreaterThan(10);
      for (const opt of ev.options) {
        expect(opt.label.length).toBeGreaterThan(3);
        expect(opt.description.length).toBeGreaterThan(3);
      }
    }
  });

  it('losing HP can never drop the player to 0', () => {
    const run: RunState = { ...createRunState('male', 'method', seededRng(4)), hp: 1 };
    const res = applyEventEffect(run, { kind: 'lose_hp', amount: 1 }, seededRng(4));
    expect(res.run.hp).toBe(1);
    const res2 = applyEventEffect({ ...run, hp: 3 }, { kind: 'lose_hp', amount: 1 }, seededRng(4));
    expect(res2.run.hp).toBe(2);
  });

  it('healing never exceeds max HP', () => {
    const run: RunState = { ...createRunState('male', 'method', seededRng(4)), hp: 4, maxHp: 5 };
    expect(applyEventEffect(run, { kind: 'heal', amount: 2 }, seededRng(4)).run.hp).toBe(5);
  });

  it('event option that would kill the player is disabled', () => {
    const run: RunState = { ...createRunState('male', 'method', seededRng(4)), hp: 1 };
    const gpu = RANDOM_EVENTS.gpu_available;
    expect(gpu.options[0].disabledWhen!(run)).toBe(true);
    expect(RANDOM_EVENTS.critical_bug.options[0].disabledWhen!(run)).toBe(true);
    expect(gpu.options[0].disabledWhen!({ ...run, hp: 2 })).toBe(false);
  });

  it('acquiring an advanced card unlocks its claim', () => {
    const run = createRunState('male', 'theoretical', seededRng(21));
    const before = suggestCard(run);
    expect(run.deck[before] ?? 0).toBe(0);
    const after = addCardToRun(run, before);
    expect(after.deck[before]).toBe(1);
    expect(after.claimPool).toContain(before);
  });

  it('duplicate advanced card adds a real card but not a duplicate claim option', () => {
    const run = createRunState('male', 'theoretical', seededRng(21));
    expect(run.deck.prior_work).toBe(1);
    const after = addCardToRun(run, 'prior_work');
    expect(after.deck.prior_work).toBe(2);
    expect(after.claimPool.filter((c) => c === 'prior_work')).toHaveLength(1);
  });

  it('grant_cross_check_charges does not add a card nor unlock the claim', () => {
    const run = createRunState('male', 'method', seededRng(31));
    const res = applyEventEffect(run, { kind: 'grant_cross_check_charges', count: 2 }, seededRng(31));
    expect(res.run.claimPool).not.toContain('cross_check');
    expect(res.run.deck.cross_check ?? 0).toBe(0);
    expect(res.run.pendingBattleModifiers.startingCrossCheckCharges).toBe(2);
  });
});

function suggestCard(run: RunState): CardId {
  return ADVANCED_CARD_IDS.find((id) => !run.claimPool.includes(id)) ?? 'counterargument';
}

describe('Test 14 — Next-battle modifier accumulation', () => {
  it('modifiers accumulate and are clamped by the engine at battle init', () => {
    let run = createRunState('male', 'empirical', seededRng(6));
    run = applyEventEffect(run, { kind: 'modify_next_battle_ap', delta: -1 }, seededRng(6)).run;
    run = applyEventEffect(run, { kind: 'modify_next_battle_ap', delta: 2 }, seededRng(6)).run;
    expect(run.pendingBattleModifiers.startingApDelta).toBe(1);

    const ctx = makeContext(DEFAULT_CONFIG, seededRng(6));
    const s = createGame(ctx, {
      reviewerProfile: REVIEWER1_PROFILE,
      startingApDelta: run.pendingBattleModifiers.startingApDelta,
    });
    expect(s.player.ap).toBe(4);
  });

  it('starting AP is clamped to [0, maxAp]', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(6));
    const low = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE, startingApDelta: -10 });
    expect(low.player.ap).toBe(0);
    const high = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE, startingApDelta: 10 });
    expect(high.player.ap).toBe(DEFAULT_CONFIG.maxAp);
  });

  it('starting hand +2 with hand-limit clamp', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(6));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE, startingHandDelta: 2 });
    expect(s.player.hand.length).toBe(6);
    const clamped = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE, startingHandDelta: 99 });
    expect(clamped.player.hand.length).toBe(DEFAULT_CONFIG.handLimit);
  });

  it('opponent suspicion -2 is clamped to 0', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(6));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE, opponentSuspicionDelta: -2 });
    expect(s.suspicion).toBe(1);
    const clamped = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE, opponentSuspicionDelta: -99 });
    expect(clamped.suspicion).toBe(0);
  });

  it('starting cross-check charges are granted without a card', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(6));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE, startingCrossCheckCharges: 2 });
    expect(s.player.crossCheckCharges).toBe(2);
    expect(s.player.hand.some((c) => c.cardId === 'cross_check')).toBe(false);
    expect(s.player.claimPool).not.toContain('cross_check');
  });

  it('modifiers are cleared after being applied', () => {
    let run = createRunState('male', 'empirical', seededRng(6));
    run = applyEventEffect(run, { kind: 'modify_next_battle_ap', delta: 2 }, seededRng(6)).run;
    expect(run.pendingBattleModifiers.startingApDelta).toBe(2);
    const cleared = clearBattleModifiers(run);
    expect(cleared.pendingBattleModifiers.startingApDelta).toBe(0);
    expect(cleared.pendingBattleModifiers.startingHandDelta).toBe(0);
    expect(cleared.pendingBattleModifiers.opponentSuspicionDelta).toBe(0);
    expect(cleared.pendingBattleModifiers.startingCrossCheckCharges).toBe(0);
  });
});

describe('Test 15 — Full run progression', () => {
  it('walks submission → battle1 → reward → event → event → battle2 → decision', () => {
    let run = createRunState('male', 'theoretical', seededRng(101));
    expect(run.nodes.map((n) => n.type)).toEqual([
      'paper_submission',
      'battle1',
      'event',
      'event',
      'battle2',
      'final_decision',
    ]);
    expect(run.currentNodeIndex).toBe(1);

    run = advanceNode(completeNode(run, 1));
    expect(run.currentNodeIndex).toBe(2);
    expect(run.nodes[2].status).toBe('available');

    run = advanceNode(completeNode(run, 2));
    expect(run.currentNodeIndex).toBe(3);
    expect(run.nodes[3].status).toBe('available');

    run = advanceNode(completeNode(run, 3));
    expect(run.currentNodeIndex).toBe(4);
    expect(run.nodes[4].status).toBe('available');

    run = advanceNode(completeNode(run, 4));
    expect(run.currentNodeIndex).toBe(5);
    expect(run.nodes[5].status).toBe('available');

    const completed = run.nodes.filter((n) => n.status === 'completed').map((n) => n.index);
    expect(completed).toEqual([0, 1, 2, 3, 4]);
  });

  it('nodes can only be entered when available', () => {
    const run = createRunState('male', 'method', seededRng(55));
    expect(run.nodes[1].status).toBe('available');
    expect(run.nodes[2].status).toBe('locked');
    expect(run.nodes[4].status).toBe('locked');
  });

  it('reward candidates are three distinct advanced cards', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const cards = pickThreeRewardCards(seededRng(seed));
      expect(new Set(cards).size).toBe(3);
      for (const c of cards) expect(ADVANCED_CARD_IDS).toContain(c);
    }
  });

  it('render options mirror the run state', () => {
    const run = createRunState('female', 'empirical', seededRng(77));
    const opts = toRenderOptions(run);
    expect(opts.playerHp).toBe(run.hp);
    expect(opts.playerMaxHp).toBe(run.maxHp);
    expect(opts.claimPool).toEqual(run.claimPool);
    expect(opts.deck).toEqual(run.deck);
  });
});

const EMPTY_STATS = {
  playerSuccessfulBluffs: 0,
  playerCaughtBluffs: 0,
  playerSuccessfulChallenges: 0,
  playerWrongChallenges: 0,
  reviewerSuccessfulChallenges: 0,
  reviewerWrongChallenges: 0,
  playerCardsPlayed: 0,
  reviewerCardsPlayed: 0,
};

describe('Run flow — battle settlement and reward step', () => {
  it('battle 1 accept heals 2 HP, keeps the battle node current, and does not skip event 1', () => {
    let run = createRunState('male', 'theoretical', seededRng(101));
    const first = resolveBattleEnd(run, {
      outcome: 'accept',
      playerHp: 3,
      rounds: 4,
      stats: EMPTY_STATS,
    });
    expect(first.screen).toBe('reward');
    expect(first.run.hp).toBe(5);
    expect(first.run.currentNodeIndex).toBe(1);
    expect(first.run.battleResults).toHaveLength(1);
    expect(first.run.battleResults[0].rounds).toBe(4);

    run = finishRewardStep(first.run, 'burden_of_proof');
    expect(run.currentNodeIndex).toBe(2);
    expect(run.nodes[1].status).toBe('completed');
    expect(run.nodes[2]).toMatchObject({ type: 'event', status: 'available' });
    expect(run.claimPool).toContain('burden_of_proof');
    expect(run.deck.burden_of_proof).toBe(1);
    expect(run.rewardHistory).toEqual([{ nodeIndex: 1, cardId: 'burden_of_proof' }]);

    run = advanceNode(completeNode(run, run.currentNodeIndex));
    expect(run.currentNodeIndex).toBe(3);
    expect(run.nodes[3]).toMatchObject({ type: 'event', status: 'available' });

    run = advanceNode(completeNode(run, run.currentNodeIndex));
    expect(run.currentNodeIndex).toBe(4);
    expect(run.nodes[4]).toMatchObject({ type: 'battle2', status: 'available' });

    const second = resolveBattleEnd(run, {
      outcome: 'weak_accept',
      playerHp: 2,
      rounds: 5,
      stats: EMPTY_STATS,
    });
    expect(second.screen).toBe('summary');
    expect(second.run.finalResult).toBe('weak_accept');
    expect(second.run.hp).toBe(2);
    expect(second.run.battleResults).toHaveLength(2);
  });

  it('skipping the reward still completes the battle node exactly once', () => {
    const run = createRunState('female', 'empirical', seededRng(102));
    const first = resolveBattleEnd(run, { outcome: 'weak_accept', playerHp: 4, rounds: 3, stats: EMPTY_STATS });
    const afterSkip = finishRewardStep(first.run, null);
    expect(afterSkip.currentNodeIndex).toBe(2);
    expect(afterSkip.nodes.filter((n) => n.status === 'completed').map((n) => n.index)).toEqual([0, 1]);
    expect(afterSkip.rewardHistory).toEqual([{ nodeIndex: 1, cardId: null }]);
    expect(afterSkip.deck).toEqual(first.run.deck);
  });

  it('losing battle 1 ends the run with reject and grants no reward', () => {
    const run = createRunState('male', 'method', seededRng(103));
    const res = resolveBattleEnd(run, { outcome: 'reject', playerHp: 0, rounds: 2, stats: EMPTY_STATS });
    expect(res.screen).toBe('summary');
    expect(res.run.finalResult).toBe('reject');
    expect(res.run.hp).toBe(0);
    expect(res.run.rewardHistory).toHaveLength(0);
  });

  it('pending next-battle modifiers are consumed by the battle that follows', () => {
    let run = createRunState('male', 'theoretical', seededRng(104));
    run = applyEventEffect(run, { kind: 'modify_next_battle_ap', delta: 1 }, seededRng(104)).run;
    const res = resolveBattleEnd(run, { outcome: 'accept', playerHp: 5, rounds: 3, stats: EMPTY_STATS });
    expect(res.run.pendingBattleModifiers.startingApDelta).toBe(0);
  });
});

describe('Test 16 — Failure and restart', () => {
  it('starting a fresh run carries no advanced cards from a previous run', () => {
    let run = createRunState('male', 'method', seededRng(202));
    run = addCardToRun(run, 'burden_of_proof');
    run = addCardToRun(run, 'cross_check');
    expect(run.claimPool).toContain('burden_of_proof');
    expect(run.claimPool).toContain('cross_check');

    const fresh = createRunState('male', 'method', seededRng(202));
    expect(fresh.claimPool).not.toContain('burden_of_proof');
    expect(fresh.claimPool).not.toContain('cross_check');
    expect(fresh.battleResults).toHaveLength(0);
    expect(fresh.eventHistory).toHaveLength(0);
    expect(fresh.rewardHistory).toHaveLength(0);
    expect(fresh.pendingBattleModifiers.startingApDelta).toBe(0);
  });

  it('a second run with the same seed reproduces the same events', () => {
    const a = createRunState('male', 'theoretical', seededRng(303));
    const b = createRunState('male', 'theoretical', seededRng(303));
    expect(a.nodes[2].eventId).toBe(b.nodes[2].eventId);
    expect(a.nodes[3].eventId).toBe(b.nodes[3].eventId);
  });

  it('an event sequence with choose_advanced_card defers the card pick', () => {
    const run = createRunState('male', 'empirical', seededRng(404));
    const res = applyEventEffect(run, RANDOM_EVENTS.gpu_available.options[0].effect, seededRng(404));
    expect(res.pendingChoose).toBe(true);
    expect(res.run.hp).toBe(run.hp - 1);
  });
});

describe('Run → battle integration', () => {
  it('battle 2 uses Reviewer #2 with 6 HP and battle 1 uses Reviewer #1 with 5 HP', () => {
    const run = createRunState('male', 'theoretical', seededRng(8));
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(8));

    const b1 = createGame(ctx, {
      reviewerProfile: REVIEWER1_PROFILE,
      playerHp: run.hp,
      playerMaxHp: run.maxHp,
      playerDeck: run.deck,
      playerClaimPool: run.claimPool,
    });
    expect(b1.reviewerName).toBe('Reviewer #1');
    expect(b1.reviewer.hp).toBe(5);
    expect(b1.reviewer.maxHp).toBe(5);
    expect(b1.player.claimPool).toContain('prior_work');
    expect(b1.player.hand.length + b1.player.deck.length + b1.player.discard.length).toBe(11);

    const b2 = createGame(ctx, { reviewerProfile: REVIEWER2_PROFILE, playerHp: 3, playerMaxHp: 5 });
    expect(b2.reviewerName).toBe('Reviewer #2');
    expect(b2.reviewer.hp).toBe(6);
    expect(b2.player.hp).toBe(3);
  });

  it('a run-level deck with duplicated advanced cards produces the right battle deck size', () => {
    let run = createRunState('male', 'method', seededRng(9));
    run = addCardToRun(run, 'red_herring');
    run = addCardToRun(run, 'red_herring');
    expect(deckSize(run.deck)).toBe(13);

    const ctx = makeContext(DEFAULT_CONFIG, seededRng(9));
    const b = createGame(ctx, {
      reviewerProfile: REVIEWER2_PROFILE,
      playerDeck: run.deck,
      playerClaimPool: run.claimPool,
    });
    expect(b.player.hand.length + b.player.deck.length + b.player.discard.length).toBe(13);
    expect(b.player.claimPool.filter((c) => c === 'red_herring')).toHaveLength(1);
  });

  it('reviewer 1 never plays a card outside its own claim pool', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const ctx = makeContext(REVIEWER1_PROFILE.gameConfig, seededRng(seed));
      let s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
      let guard = 0;
      while (s.phase !== 'game_over' && guard++ < 400) {
        if (s.phase === 'reviewer_turn') {
          const a = decideReviewerAction(buildReviewerView(s, ctx), ctx);
          if (a.type === 'end') {
            s = endTurn(s, 'reviewer', ctx).state;
          } else {
            expect(s.reviewer.claimPool).toContain(a.declaredCardId);
            const d = declarePlay(s, 'reviewer', a.instanceId, a.declaredCardId, ctx);
            if (!d.ok) {
              s = endTurn(s, 'reviewer', ctx).state;
            } else {
              s = respondToPlay(d.state, false, ctx).state;
            }
          }
        } else {
          s = endTurn(s, 'player', ctx).state;
        }
      }
    }
  });

  it('claim pool grows across the run without duplicate entries', () => {
    let run = createRunState('male', 'empirical', seededRng(66));
    const initial = run.claimPool.length;
    for (const adv of ADVANCED_CARD_IDS) {
      run = addCardToRun(run, adv);
      run = addCardToRun(run, adv);
    }
    expect(run.claimPool.length).toBe(BASIC_CLAIM_POOL.length + ADVANCED_CARD_IDS.length);
    expect(run.claimPool.length).toBeGreaterThan(initial);
    expect(new Set(run.claimPool).size).toBe(run.claimPool.length);
  });

  it('event ids are recorded so the same event cannot repeat in a run', () => {
    let run = createRunState('male', 'method', seededRng(88));
    const ev: EventId = run.nodes[2].eventId!;
    run = { ...run, encounteredEventIds: [...run.encounteredEventIds, ev] };
    expect(run.encounteredEventIds).toContain(ev);
    expect(run.encounteredEventIds.filter((e) => e === ev)).toHaveLength(1);
  });
});

describe('Advanced card cost config', () => {
  it('all cards use a 1 AP base cost and the data structure allows overrides', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(1));
    const s = createGame(ctx);
    for (const id of [...BASIC_CLAIM_POOL, ...ADVANCED_CARD_IDS]) {
      expect(ctx.cards[id].baseCost).toBe(1);
      expect(getCost(s.player, id, ctx)).toBe(1);
    }
  });
});
