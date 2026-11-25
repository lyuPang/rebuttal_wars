import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import {
  createGame,
  declarePlay,
  endTurn,
  getCost,
  makeContext,
  respondToPlay,
  totalShield,
  drawCards,
} from './engine';
import { buildChallengeView, buildReviewerView, decideReviewerAction, decideReviewerChallenge } from './ai';
import { seededRng } from './rng';
import type { CardId, GameState, Side } from './types';

function setup(seed = 1) {
  const ctx = makeContext(DEFAULT_CONFIG, seededRng(seed));
  const state = createGame(ctx);
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

function countCards(state: GameState, side: Side): number {
  const c = state[side];
  return c.hand.length + c.deck.length + c.discard.length;
}

describe('Test 1: 类型费用', () => {
  it('同类型递增，不同类型独立', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    const ids = giveHand(s, 'player', ['argument', 'argument', 'evidence', 'argument']);
    expect(getCost(s.player, 'argument', ctx)).toBe(1);
    s = play(s, 'player', ids[0], 'argument', false, ctx);
    expect(getCost(s.player, 'argument', ctx)).toBe(2);
    expect(getCost(s.player, 'critical_point', ctx)).toBe(2);
    expect(getCost(s.player, 'evidence', ctx)).toBe(1);
    expect(getCost(s.player, 'revision', ctx)).toBe(1);
    s = play(s, 'player', ids[1], 'argument', false, ctx);
    expect(getCost(s.player, 'argument', ctx)).toBe(3);
    expect(s.player.ap).toBe(2);
  });

  it('宣称费用不足时无法出牌', () => {
    const { ctx, state } = setup();
    state.player.ap = 1;
    state.player.typeUsage.attack = 1;
    const ids = giveHand(state, 'player', ['argument']);
    expect(declarePlay(state, 'player', ids[0], 'argument', ctx).ok).toBe(false);
    expect(declarePlay(state, 'player', ids[0], 'evidence', ctx).ok).toBe(true);
  });
});

describe('Test 2: 真实宣称', () => {
  it('接受时执行 Argument', () => {
    const { ctx, state } = setup();
    const ids = giveHand(state, 'player', ['argument']);
    const s = play(state, 'player', ids[0], 'argument', false, ctx);
    expect(s.reviewer.hp).toBe(4);
    expect(s.reviewer.ap).toBe(3);
  });
  it('错误质疑时执行 Argument，质疑者 -1 AP', () => {
    const { ctx, state } = setup();
    const ids = giveHand(state, 'player', ['argument']);
    const s = play(state, 'player', ids[0], 'argument', true, ctx);
    expect(s.reviewer.hp).toBe(4);
    expect(s.reviewer.ap).toBe(2);
    expect(s.player.ap).toBe(2);
    expect(s.lastResolution?.outcome).toBe('challenge_failed');
    expect(s.suspicion).toBe(1);
  });
});

describe('Test 3: 虚假宣称', () => {
  it('接受时执行宣称的 Critical Point', () => {
    const { ctx, state } = setup();
    state.reviewer.shields = [{ id: 'x', amount: 2, kind: 'temporary', expires: 'owner_turn_start' }];
    const ids = giveHand(state, 'player', ['evidence']);
    const s = play(state, 'player', ids[0], 'critical_point', false, ctx);
    expect(s.reviewer.hp).toBe(4);
    expect(totalShield(s.reviewer)).toBe(2);
    expect(totalShield(s.player)).toBe(0);
    expect(s.stats.playerSuccessfulBluffs).toBe(1);
  });
  it('被识破时执行 Evidence 并扣惩罚', () => {
    const { ctx, state } = setup();
    const ids = giveHand(state, 'player', ['evidence']);
    const s = play(state, 'player', ids[0], 'critical_point', true, ctx);
    expect(s.reviewer.hp).toBe(5);
    expect(totalShield(s.player)).toBe(1);
    expect(s.player.ap).toBe(1);
    expect(s.reviewer.ap).toBe(4);
    expect(s.suspicion).toBe(4);
    expect(s.player.typeUsage).toEqual({ attack: 1, defense: 1, utility: 0 });
  });
});

describe('Test 4: 跨类型费用', () => {
  it('max(1,3)+1 = 4 AP，两类计数 +1，不足进入欠额', () => {
    const { ctx, state } = setup();
    state.player.ap = 3;
    state.player.typeUsage.attack = 2;
    const ids = giveHand(state, 'player', ['argument']);
    const s = play(state, 'player', ids[0], 'revision', true, ctx);
    expect(s.lastResolution?.extraCost).toBe(3);
    expect(s.player.ap).toBe(0);
    expect(s.player.apDebt).toBe(1);
    expect(s.player.typeUsage.attack).toBe(3);
    expect(s.player.typeUsage.utility).toBe(1);
    expect(s.reviewer.hp).toBe(4);
  });
  it('AP 充足时总共扣 4', () => {
    const { ctx, state } = setup();
    state.player.ap = 5;
    state.player.typeUsage.attack = 2;
    const ids = giveHand(state, 'player', ['argument']);
    const s = play(state, 'player', ids[0], 'revision', true, ctx);
    expect(s.player.ap).toBe(1);
    expect(s.player.apDebt).toBe(0);
  });
});

describe('Test 5: Revision 资源循环', () => {
  it('费用递增，AP 不会无限增长', () => {
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
      expect(s.player.ap).toBeLessThanOrEqual(5);
    }
    expect(costs.slice(0, 3)).toEqual([1, 2, 3]);
    expect(costs.length).toBeLessThan(5);
  });
  it('Revision 先偿还欠额', () => {
    const { ctx, state } = setup();
    state.player.ap = 1;
    state.player.apDebt = 0;
    const ids = giveHand(state, 'player', ['revision']);
    const d = declarePlay(state, 'player', ids[0], 'revision', ctx);
    d.state.player.apDebt = 1;
    const r = respondToPlay(d.state, false, ctx);
    expect(r.state.player.apDebt).toBe(0);
    expect(r.state.player.ap).toBe(1);
  });
});

describe('Test 6: 护盾', () => {
  it('普通攻击消耗护盾，穿透无视护盾，回合开始清零', () => {
    const { ctx, state } = setup();
    let s = state;
    const ids = giveHand(s, 'player', ['strong_evidence']);
    s = play(s, 'player', ids[0], 'strong_evidence', false, ctx);
    expect(totalShield(s.player)).toBe(2);
    s = endTurn(s, 'player', ctx).state;
    const r = giveHand(s, 'reviewer', ['argument', 'critical_point']);
    s = play(s, 'reviewer', r[0], 'argument', false, ctx);
    expect(totalShield(s.player)).toBe(1);
    expect(s.player.hp).toBe(5);
    s = play(s, 'reviewer', r[1], 'critical_point', false, ctx);
    expect(totalShield(s.player)).toBe(1);
    expect(s.player.hp).toBe(4);
    s = endTurn(s, 'reviewer', ctx).state;
    expect(s.activeSide).toBe('player');
    expect(totalShield(s.player)).toBe(0);
  });
});

describe('Test 7: 警惕值', () => {
  it('成功 +2，失败 -1，范围 [0,5]', () => {
    const { ctx, state } = setup();
    let s = state;
    s.player.ap = 5;
    s.reviewer.ap = 5;
    const ids = giveHand(s, 'player', ['evidence', 'evidence', 'argument', 'argument', 'argument']);
    s = play(s, 'player', ids[0], 'argument', true, ctx);
    expect(s.suspicion).toBe(4);
    s.player.ap = 5;
    s = play(s, 'player', ids[1], 'revision', true, ctx);
    expect(s.suspicion).toBe(5);
    for (let i = 2; i < 5; i++) {
      s.player.ap = 5;
      s.player.typeUsage.attack = 0;
      s.reviewer.ap = 5;
      s = play(s, 'player', ids[i], 'argument', true, ctx);
    }
    expect(s.suspicion).toBe(2);
    s.suspicion = 0;
    const more = giveHand(s, 'player', ['argument']);
    s.player.ap = 5;
    s.player.typeUsage.attack = 0;
    s = play(s, 'player', more[0], 'argument', true, ctx);
    expect(s.suspicion).toBe(0);
  });
  it('AP = 0 时无法质疑', () => {
    const { ctx, state } = setup();
    state.reviewer.ap = 0;
    const ids = giveHand(state, 'player', ['evidence']);
    const d = declarePlay(state, 'player', ids[0], 'critical_point', ctx);
    expect(respondToPlay(d.state, true, ctx).ok).toBe(false);
    const view = buildChallengeView(d.state)!;
    for (let i = 0; i < 50; i++) expect(decideReviewerChallenge(view, ctx)).toBe(false);
  });
});

describe('Test 8: 隐藏信息', () => {
  it('接受的虚假宣称不进入公开记录', () => {
    const { ctx, state } = setup();
    const ids = giveHand(state, 'player', ['investigation']);
    const s = play(state, 'player', ids[0], 'critical_point', false, ctx);
    const last = s.history[s.history.length - 1];
    expect(last.revealedCardId).toBeNull();
    expect(last.executedCardId).toBe('critical_point');
    expect(last.text).not.toContain('Investigation');
    expect(JSON.stringify(s.history)).not.toContain('investigation');
  });
  it('质疑视图不包含真实卡牌', () => {
    const { ctx, state } = setup();
    const ids = giveHand(state, 'player', ['investigation']);
    const d = declarePlay(state, 'player', ids[0], 'critical_point', ctx);
    const view = buildChallengeView(d.state)!;
    const json = JSON.stringify(view);
    expect(json).not.toContain('investigation');
    expect(json).not.toContain(ids[0]);
  });
  it('Reviewer 决策视图不包含玩家手牌', () => {
    const { ctx, state } = setup();
    const s = endTurn(state, 'player', ctx).state;
    giveHand(s, 'player', ['investigation', 'investigation']);
    const view = buildReviewerView(s);
    expect(JSON.stringify(view.opponent)).not.toContain('investigation');
    expect(view.opponent.handCount).toBe(2);
  });
});

describe('Test 9: 游戏结束', () => {
  it('HP 归零立即结束，并拒绝后续操作', () => {
    const { ctx, state } = setup();
    state.reviewer.hp = 1;
    const ids = giveHand(state, 'player', ['argument', 'argument']);
    const s = play(state, 'player', ids[0], 'argument', false, ctx);
    expect(s.phase).toBe('game_over');
    expect(s.result?.outcome).toBe('accept');
    expect(declarePlay(s, 'player', ids[1], 'argument', ctx).ok).toBe(false);
    expect(endTurn(s, 'player', ctx).ok).toBe(false);
  });
  it('达到最大轮次按 HP 判定', () => {
    const { ctx, state } = setup();
    let s = state;
    for (let r = 0; r < DEFAULT_CONFIG.maxRounds; r++) {
      s = endTurn(s, 'player', ctx).state;
      s = endTurn(s, 'reviewer', ctx).state;
    }
    expect(s.phase).toBe('game_over');
    expect(s.result?.outcome).toBe('weak_accept');
    expect(s.round).toBe(DEFAULT_CONFIG.maxRounds);
  });
});

describe('边界情况', () => {
  it('抽牌不超过手牌上限，牌库耗尽重洗弃牌堆且不丢牌', () => {
    const { ctx, state } = setup();
    const c = state.player;
    expect(countCards(state, 'player')).toBe(20);
    c.discard.push(...c.deck.splice(0, c.deck.length - 1));
    expect(countCards(state, 'player')).toBe(20);
    const n = drawCards(c, 5, ctx);
    expect(c.hand.length).toBeLessThanOrEqual(DEFAULT_CONFIG.handLimit);
    expect(n).toBe(2);
    expect(countCards(state, 'player')).toBe(20);
    const ids = new Set([...c.hand, ...c.deck, ...c.discard].map((x) => x.instanceId));
    expect(ids.size).toBe(20);
  });
  it('无可抽卡时正常结束', () => {
    const { ctx, state } = setup();
    state.player.hand = [];
    state.player.deck = [];
    state.player.discard = [];
    expect(drawCards(state.player, 2, ctx)).toBe(0);
  });
  it('Investigation 对空手牌无效但正常完成', () => {
    const { ctx, state } = setup();
    state.reviewer.hand = [];
    const ids = giveHand(state, 'player', ['investigation']);
    const s = play(state, 'player', ids[0], 'investigation', false, ctx);
    expect(s.lastResolution?.peekedCardId).toBeNull();
    expect(s.phase).toBe('player_turn');
  });
  it('重复响应不会重复结算', () => {
    const { ctx, state } = setup();
    const ids = giveHand(state, 'player', ['argument']);
    const d = declarePlay(state, 'player', ids[0], 'argument', ctx);
    expect(declarePlay(d.state, 'player', ids[0], 'argument', ctx).ok).toBe(false);
    const r1 = respondToPlay(d.state, false, ctx);
    const r2 = respondToPlay(r1.state, false, ctx);
    expect(r2.ok).toBe(false);
    expect(r1.state.reviewer.hp).toBe(4);
  });
  it('AP 恢复先还欠额，第一回合不恢复不抽牌', () => {
    const { ctx, state } = setup();
    expect(state.player.hand.length).toBe(4);
    let s = endTurn(state, 'player', ctx).state;
    expect(s.reviewer.hand.length).toBe(4);
    expect(s.reviewer.ap).toBe(3);
    s.player.ap = 0;
    s.player.apDebt = 1;
    s = endTurn(s, 'reviewer', ctx).state;
    expect(s.player.apDebt).toBe(0);
    expect(s.player.ap).toBe(2);
    expect(s.player.hand.length).toBe(6);
  });
});

describe('Test 10: 完整对局（AI 自动对战模拟）', () => {
  it('多局模拟无卡死、卡牌守恒', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const ctx = makeContext(DEFAULT_CONFIG, seededRng(seed));
      let s = createGame(ctx);
      let guard = 0;
      while (s.phase !== 'game_over') {
        guard++;
        expect(guard).toBeLessThan(2000);
        if (s.phase === 'player_turn') {
          const c = s.player;
          const affordable = c.hand.find((h) => c.ap >= getCost(c, h.cardId, ctx));
          if (affordable && ctx.rng() < 0.8) {
            const declared: CardId = ctx.rng() < 0.3 ? 'critical_point' : affordable.cardId;
            const d = declarePlay(s, 'player', affordable.instanceId, declared, ctx);
            if (d.ok) {
              s = d.state;
              const view = buildChallengeView(s)!;
              s = respondToPlay(s, decideReviewerChallenge(view, ctx), ctx).state;
            } else {
              s = endTurn(s, 'player', ctx).state;
            }
          } else {
            s = endTurn(s, 'player', ctx).state;
          }
        } else if (s.phase === 'reviewer_turn') {
          const a = decideReviewerAction(buildReviewerView(s), ctx);
          if (a.type === 'end') {
            s = endTurn(s, 'reviewer', ctx).state;
          } else {
            const d = declarePlay(s, 'reviewer', a.instanceId, a.declaredCardId, ctx);
            expect(d.ok).toBe(true);
            s = d.state;
            const canCh = s.player.ap >= 1;
            s = respondToPlay(s, canCh && ctx.rng() < 0.3, ctx).state;
          }
        } else {
          throw new Error(`unexpected phase ${s.phase}`);
        }
        if (s.phase !== 'awaiting_player_challenge' && s.phase !== 'awaiting_reviewer_challenge') {
          expect(countCards(s, 'player')).toBe(20);
          expect(countCards(s, 'reviewer')).toBe(20);
        }
        expect(s.player.hp).toBeGreaterThanOrEqual(0);
        expect(s.reviewer.ap).toBeLessThanOrEqual(5);
        expect(s.suspicion).toBeGreaterThanOrEqual(0);
        expect(s.suspicion).toBeLessThanOrEqual(5);
      }
      expect(s.result).not.toBeNull();
    }
  });
});
