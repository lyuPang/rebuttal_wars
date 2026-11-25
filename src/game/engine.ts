import { DEFAULT_CONFIG, type GameConfig } from './config';
import { buildCardDefinitions, buildDeck, CARD_IDS } from './cards';
import { defaultRng, pickRandom, shuffle, type Rng } from './rng';
import type {
  CardDefinition,
  CardId,
  CharacterState,
  GameResult,
  GameState,
  HistoryEntry,
  PendingPlay,
  PublicPlayInfo,
  Resolution,
  Side,
  SideDelta,
} from './types';

export interface EngineContext {
  config: GameConfig;
  rng: Rng;
  cards: Record<CardId, CardDefinition>;
}

export function makeContext(config: GameConfig = DEFAULT_CONFIG, rng: Rng = defaultRng): EngineContext {
  return { config, rng, cards: buildCardDefinitions(config) };
}

export interface ActionResult {
  ok: boolean;
  state: GameState;
  error?: string;
}

export const SIDE_NAME: Record<Side, string> = {
  player: '作者',
  reviewer: 'Reviewer #2',
};

export function opponentOf(side: Side): Side {
  return side === 'player' ? 'reviewer' : 'player';
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function totalShield(c: CharacterState): number {
  return c.shields.reduce((s, sh) => s + sh.amount, 0);
}

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error };
}

function createCharacter(side: Side, ctx: EngineContext): CharacterState {
  const { config } = ctx;
  return {
    side,
    hp: config.initialHp,
    maxHp: config.initialHp,
    ap: config.initialAp,
    maxAp: config.maxAp,
    apDebt: 0,
    shields: [],
    hand: [],
    deck: shuffle(buildDeck(side === 'player' ? 'P' : 'R', config), ctx.rng),
    discard: [],
    typeUsage: { attack: 0, defense: 0, utility: 0 },
    turnsTaken: 0,
  };
}

export function spendAp(c: CharacterState, amount: number): void {
  if (amount <= 0) return;
  if (c.ap >= amount) {
    c.ap -= amount;
  } else {
    c.apDebt += amount - c.ap;
    c.ap = 0;
  }
}

export function gainAp(c: CharacterState, amount: number): { repaid: number; gained: number } {
  if (amount <= 0) return { repaid: 0, gained: 0 };
  const repaid = Math.min(c.apDebt, amount);
  c.apDebt -= repaid;
  const rest = amount - repaid;
  const before = c.ap;
  c.ap = Math.min(c.maxAp, c.ap + rest);
  return { repaid, gained: c.ap - before };
}

export function drawCards(c: CharacterState, count: number, ctx: EngineContext): number {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    if (c.hand.length >= ctx.config.handLimit) break;
    if (c.deck.length === 0) {
      if (c.discard.length === 0) break;
      c.deck = shuffle(c.discard, ctx.rng);
      c.discard = [];
    }
    const card = c.deck.pop();
    if (!card) break;
    c.hand.push(card);
    drawn++;
  }
  return drawn;
}

export function applyDamage(
  target: CharacterState,
  amount: number,
  pierce: boolean,
): { absorbed: number; hpLoss: number } {
  let remaining = amount;
  let absorbed = 0;
  if (!pierce) {
    for (const sh of target.shields) {
      if (remaining <= 0) break;
      const take = Math.min(sh.amount, remaining);
      sh.amount -= take;
      remaining -= take;
      absorbed += take;
    }
    target.shields = target.shields.filter((sh) => sh.amount > 0);
  }
  const hpLoss = Math.min(target.hp, remaining);
  target.hp = Math.max(0, target.hp - remaining);
  return { absorbed, hpLoss };
}

export function getCost(c: CharacterState, cardId: CardId, ctx: EngineContext): number {
  const def = ctx.cards[cardId];
  return def.baseCost + c.typeUsage[def.category];
}

export function canAffordDeclaration(c: CharacterState, cardId: CardId, ctx: EngineContext): boolean {
  return c.ap >= getCost(c, cardId, ctx);
}

export function canPlayAnything(c: CharacterState, ctx: EngineContext): boolean {
  return c.hand.length > 0 && CARD_IDS.some((id) => canAffordDeclaration(c, id, ctx));
}

export function canChallenge(c: CharacterState, ctx: EngineContext): boolean {
  return c.ap >= ctx.config.challengeMinAp;
}

function pushHistory(state: GameState, entry: Omit<HistoryEntry, 'id' | 'round'>): void {
  state.history.push({ ...entry, id: state.nextId++, round: state.round });
}

function startTurn(state: GameState, side: Side, ctx: EngineContext): void {
  const c = state[side];
  state.activeSide = side;
  state.phase = side === 'player' ? 'player_turn' : 'reviewer_turn';
  let text = `—— 第 ${state.round} 轮：${SIDE_NAME[side]} 的回合 ——`;
  if (c.turnsTaken > 0) {
    c.shields = c.shields.filter((sh) => sh.expires !== 'owner_turn_start');
    c.typeUsage = { attack: 0, defense: 0, utility: 0 };
    const { repaid, gained } = gainAp(c, ctx.config.apRecoveryPerTurn);
    const drawn = drawCards(c, ctx.config.drawPerTurn, ctx);
    const parts = [`恢复 ${gained} AP`];
    if (repaid > 0) parts.push(`偿还欠额 ${repaid}`);
    parts.push(`抽 ${drawn} 张牌`);
    text += `（${parts.join('，')}）`;
  }
  c.turnsTaken++;
  pushHistory(state, { kind: 'turn', actorSide: side, text });
}

export function createGame(ctx: EngineContext = makeContext()): GameState {
  const player = createCharacter('player', ctx);
  const reviewer = createCharacter('reviewer', ctx);
  const state: GameState = {
    phase: 'player_turn',
    round: 1,
    activeSide: 'player',
    player,
    reviewer,
    suspicion: ctx.config.suspicion.initial,
    pendingPlay: null,
    lastResolution: null,
    history: [],
    result: null,
    stats: {
      playerSuccessfulBluffs: 0,
      playerCaughtBluffs: 0,
      playerSuccessfulChallenges: 0,
      playerWrongChallenges: 0,
      reviewerSuccessfulChallenges: 0,
      reviewerWrongChallenges: 0,
      playerCardsPlayed: 0,
      reviewerCardsPlayed: 0,
    },
    reviewerMemory: { observedPlayerCards: [] },
    nextId: 1,
  };
  drawCards(player, ctx.config.initialHandSize, ctx);
  drawCards(reviewer, ctx.config.initialHandSize, ctx);
  pushHistory(state, { kind: 'system', text: '论文已提交。Reviewer #2 已就位。Rebuttal 开始！' });
  startTurn(state, 'player', ctx);
  return state;
}

export function challengeProbability(suspicion: number, config: GameConfig = DEFAULT_CONFIG): number {
  return Math.min(1, Math.max(0, config.aiChallenge.base + config.aiChallenge.perSuspicion * suspicion));
}

export function getPublicPlayInfo(state: GameState): PublicPlayInfo | null {
  const p = state.pendingPlay;
  if (!p) return null;
  return { id: p.id, actorSide: p.actorSide, declaredCardId: p.declaredCardId, declaredCost: p.declaredCost };
}

export function declarePlay(
  state: GameState,
  side: Side,
  instanceId: string,
  declaredCardId: CardId,
  ctx: EngineContext = makeContext(),
): ActionResult {
  if (state.result || state.phase === 'game_over') return fail(state, '游戏已结束');
  const expectedPhase = side === 'player' ? 'player_turn' : 'reviewer_turn';
  if (state.phase !== expectedPhase || state.activeSide !== side) return fail(state, '现在不是该角色的出牌阶段');
  if (state.pendingPlay) return fail(state, '已有待结算的出牌');
  if (!CARD_IDS.includes(declaredCardId)) return fail(state, '无效的宣称');
  const s = clone(state);
  const c = s[side];
  const idx = c.hand.findIndex((h) => h.instanceId === instanceId);
  if (idx < 0) return fail(state, '手牌中没有这张牌');
  const declaredCost = getCost(c, declaredCardId, ctx);
  if (c.ap < declaredCost) return fail(state, 'AP 不足以支付宣称费用');

  const [card] = c.hand.splice(idx, 1);
  const actualTypeCostSnapshot = getCost(c, card.cardId, ctx);
  spendAp(c, declaredCost);
  c.typeUsage[ctx.cards[declaredCardId].category]++;

  const pending: PendingPlay = {
    id: s.nextId++,
    actorSide: side,
    actualCardInstanceId: card.instanceId,
    actualCardId: card.cardId,
    declaredCardId,
    declaredCost,
    actualTypeCostSnapshot,
    challengeStatus: 'pending',
  };
  s.pendingPlay = pending;
  s.lastResolution = null;
  if (side === 'player') s.stats.playerCardsPlayed++;
  else s.stats.reviewerCardsPlayed++;
  s.phase = side === 'player' ? 'awaiting_reviewer_challenge' : 'awaiting_player_challenge';
  return { ok: true, state: s };
}

function snapshot(c: CharacterState): SideDelta {
  return { hp: c.hp, ap: c.ap, apDebt: c.apDebt, shield: totalShield(c) };
}

function diff(a: SideDelta, b: SideDelta): SideDelta {
  return { hp: b.hp - a.hp, ap: b.ap - a.ap, apDebt: b.apDebt - a.apDebt, shield: b.shield - a.shield };
}

function clampSuspicion(v: number, config: GameConfig): number {
  return Math.max(config.suspicion.min, Math.min(config.suspicion.max, v));
}

function checkHpResult(s: GameState): GameResult | null {
  if (s.reviewer.hp <= 0) return { outcome: 'accept', reason: 'hp', winner: 'player' };
  if (s.player.hp <= 0) return { outcome: 'reject', reason: 'hp', winner: 'reviewer' };
  return null;
}

function describeDelta(side: Side, d: SideDelta): string {
  const parts: string[] = [];
  if (d.hp) parts.push(`HP ${d.hp > 0 ? '+' : ''}${d.hp}`);
  if (d.ap) parts.push(`AP ${d.ap > 0 ? '+' : ''}${d.ap}`);
  if (d.apDebt) parts.push(`欠额 ${d.apDebt > 0 ? '+' : ''}${d.apDebt}`);
  if (d.shield) parts.push(`护盾 ${d.shield > 0 ? '+' : ''}${d.shield}`);
  return parts.length ? `${SIDE_NAME[side]}：${parts.join('，')}` : '';
}

export function respondToPlay(
  state: GameState,
  challenge: boolean,
  ctx: EngineContext = makeContext(),
): ActionResult {
  if (state.result || state.phase === 'game_over') return fail(state, '游戏已结束');
  const p = state.pendingPlay;
  if (!p) return fail(state, '没有待响应的出牌');
  const expectedPhase = p.actorSide === 'player' ? 'awaiting_reviewer_challenge' : 'awaiting_player_challenge';
  if (state.phase !== expectedPhase) return fail(state, '当前不在响应阶段');
  const responderSide = opponentOf(p.actorSide);
  if (challenge && !canChallenge(state[responderSide], ctx)) return fail(state, 'AP 不足，无法质疑');

  const s = clone(state);
  s.phase = 'resolving_action';
  const pending = s.pendingPlay!;
  const actor = s[pending.actorSide];
  const responder = s[responderSide];
  const before = { player: snapshot(s.player), reviewer: snapshot(s.reviewer) };
  const { config } = ctx;

  const isTruthful = pending.actualCardId === pending.declaredCardId;
  let executed: CardId = pending.declaredCardId;
  let extraCost = 0;

  if (!challenge) {
    pending.challengeStatus = 'accepted';
    if (pending.actorSide === 'player' && !isTruthful) s.stats.playerSuccessfulBluffs++;
  } else if (!isTruthful) {
    pending.challengeStatus = 'challenge_success';
    gainAp(responder, config.challengeReward);
    extraCost = Math.max(0, pending.actualTypeCostSnapshot - pending.declaredCost) + config.bluffCaughtPenalty;
    spendAp(actor, extraCost);
    const actualCat = ctx.cards[pending.actualCardId].category;
    const declaredCat = ctx.cards[pending.declaredCardId].category;
    if (actualCat !== declaredCat) actor.typeUsage[actualCat]++;
    executed = pending.actualCardId;
    if (responderSide === 'reviewer') {
      s.suspicion = clampSuspicion(s.suspicion + config.suspicion.onCatchBluff, config);
      s.stats.reviewerSuccessfulChallenges++;
      s.stats.playerCaughtBluffs++;
    } else {
      s.stats.playerSuccessfulChallenges++;
    }
  } else {
    pending.challengeStatus = 'challenge_failed';
    spendAp(responder, config.challengeFailPenalty);
    if (responderSide === 'reviewer') {
      s.suspicion = clampSuspicion(s.suspicion + config.suspicion.onFalseAccusation, config);
      s.stats.reviewerWrongChallenges++;
    } else {
      s.stats.playerWrongChallenges++;
    }
  }

  const resolution: Resolution = {
    playId: pending.id,
    actorSide: pending.actorSide,
    declaredCardId: pending.declaredCardId,
    challenged: challenge,
    outcome: pending.challengeStatus,
    revealedCardId: challenge ? pending.actualCardId : null,
    executedCardId: executed,
    extraCost,
    deltas: { player: before.player, reviewer: before.reviewer },
  };

  const effect = ctx.cards[executed].effect;
  const target = s[opponentOf(pending.actorSide)];
  const effectParts: string[] = [];
  switch (effect.kind) {
    case 'damage': {
      const r = applyDamage(target, effect.amount, effect.pierce);
      resolution.damage = { target: target.side, ...r, pierce: effect.pierce };
      effectParts.push(
        r.absorbed > 0
          ? `护盾抵挡 ${r.absorbed}，${SIDE_NAME[target.side]} 失去 ${r.hpLoss} HP`
          : `${SIDE_NAME[target.side]} 失去 ${r.hpLoss} HP${effect.pierce ? '（穿透）' : ''}`,
      );
      break;
    }
    case 'shield': {
      actor.shields.push({
        id: `sh-${s.nextId++}`,
        amount: effect.amount,
        kind: 'temporary',
        expires: 'owner_turn_start',
      });
      resolution.shieldGained = effect.amount;
      effectParts.push(`${SIDE_NAME[actor.side]} 获得 ${effect.amount} 点护盾`);
      break;
    }
    case 'draw': {
      const n = drawCards(actor, effect.amount, ctx);
      resolution.cardsDrawn = n;
      effectParts.push(`${SIDE_NAME[actor.side]} 抽了 ${n} 张牌`);
      break;
    }
    case 'gain_ap': {
      const r = gainAp(actor, effect.amount);
      resolution.apGained = r.gained;
      resolution.apDebtRepaid = r.repaid;
      effectParts.push(
        `${SIDE_NAME[actor.side]} 恢复 ${r.gained} AP${r.repaid ? `（偿还欠额 ${r.repaid}）` : ''}`,
      );
      break;
    }
    case 'peek': {
      const peeked = pickRandom(target.hand, ctx.rng);
      resolution.peekedCardId = peeked ? peeked.cardId : null;
      if (peeked && pending.actorSide === 'reviewer') {
        s.reviewerMemory.observedPlayerCards.push({
          instanceId: peeked.instanceId,
          cardId: peeked.cardId,
          round: s.round,
        });
      }
      effectParts.push(peeked ? `${SIDE_NAME[actor.side]} 偷看了对方一张手牌` : '对方没有手牌，调查无果');
      break;
    }
  }

  resolution.deltas = {
    player: diff(before.player, snapshot(s.player)),
    reviewer: diff(before.reviewer, snapshot(s.reviewer)),
  };

  const result = checkHpResult(s);
  actor.discard.push({ instanceId: pending.actualCardInstanceId, cardId: pending.actualCardId });

  const declaredName = ctx.cards[pending.declaredCardId].name;
  let head = `${SIDE_NAME[pending.actorSide]} 宣称 ${declaredName}`;
  if (!challenge) head += ` → ${SIDE_NAME[responderSide]} 接受`;
  else if (pending.challengeStatus === 'challenge_success')
    head += ` → ${SIDE_NAME[responderSide]} 质疑成功！真实卡牌是 ${ctx.cards[pending.actualCardId].name}（额外扣 ${extraCost} AP）`;
  else head += ` → ${SIDE_NAME[responderSide]} 质疑失败！确实是 ${declaredName}`;
  const deltaText = (['player', 'reviewer'] as Side[])
    .map((sd) => describeDelta(sd, resolution.deltas[sd]))
    .filter(Boolean)
    .join('；');
  pushHistory(s, {
    kind: 'play',
    actorSide: pending.actorSide,
    declaredCardId: pending.declaredCardId,
    challenged: challenge,
    challengeCorrect: challenge ? pending.challengeStatus === 'challenge_success' : undefined,
    revealedCardId: resolution.revealedCardId,
    executedCardId: executed,
    deltas: resolution.deltas,
    text: `${head}。效果：${effectParts.join('；')}${deltaText ? `。【${deltaText}】` : ''}`,
  });

  s.lastResolution = resolution;
  s.pendingPlay = null;
  if (result) {
    finishGame(s, result);
  } else {
    s.phase = pending.actorSide === 'player' ? 'player_turn' : 'reviewer_turn';
  }
  return { ok: true, state: s };
}

function finishGame(s: GameState, result: GameResult): void {
  s.result = result;
  s.phase = 'game_over';
  const label = result.outcome === 'accept' ? 'Accept' : result.outcome === 'weak_accept' ? 'Weak Accept' : 'Reject';
  pushHistory(s, { kind: 'system', text: `游戏结束：${label}` });
}

export function deadlineOutcome(playerHp: number, reviewerHp: number): GameResult {
  if (playerHp > reviewerHp) return { outcome: 'accept', reason: 'deadline', winner: 'player' };
  if (playerHp === reviewerHp) return { outcome: 'weak_accept', reason: 'deadline', winner: null };
  return { outcome: 'reject', reason: 'deadline', winner: 'reviewer' };
}

export function endTurn(state: GameState, side: Side, ctx: EngineContext = makeContext()): ActionResult {
  if (state.result || state.phase === 'game_over') return fail(state, '游戏已结束');
  const expectedPhase = side === 'player' ? 'player_turn' : 'reviewer_turn';
  if (state.phase !== expectedPhase || state.activeSide !== side) return fail(state, '现在不能结束回合');
  if (state.pendingPlay) return fail(state, '还有待结算的出牌');
  const s = clone(state);
  s.lastResolution = null;
  pushHistory(s, { kind: 'system', actorSide: side, text: `${SIDE_NAME[side]} 结束回合` });
  if (side === 'player') {
    startTurn(s, 'reviewer', ctx);
  } else if (s.round >= ctx.config.maxRounds) {
    pushHistory(s, { kind: 'system', text: 'Rebuttal Deadline！比较双方 HP。' });
    finishGame(s, deadlineOutcome(s.player.hp, s.reviewer.hp));
  } else {
    s.round++;
    startTurn(s, 'player', ctx);
  }
  return { ok: true, state: s };
}
