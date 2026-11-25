import { DEFAULT_CONFIG, type GameConfig } from './config';
import { REVIEWER2_PROFILE, type ReviewerConfig } from './reviewers';
import { buildCardDefinitions, buildDeck, CARD_IDS, BASIC_CLAIM_POOL, PLAYER_BASE_DECK } from './cards';
import { defaultRng, pickRandom, shuffle, type Rng } from './rng';
import { logText } from '../i18n/log';
import { cardName, reviewerLabel } from '../i18n/content';
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
  Category,
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
  player: 'Author',
  reviewer: 'Reviewer',
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

export function totalTemporaryShield(c: CharacterState): number {
  return c.shields.filter((s) => s.kind === 'temporary').reduce((acc, s) => acc + s.amount, 0);
}

export function totalPermanentShield(c: CharacterState): number {
  return c.shields.filter((s) => s.kind === 'permanent').reduce((acc, s) => acc + s.amount, 0);
}

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error };
}

function createCharacter(
  side: Side,
  hp: number,
  maxHp: number,
  cardCounts: Partial<Record<CardId, number>>,
  claimPool: CardId[],
  initialAp: number,
  ctx: EngineContext,
): CharacterState {
  return {
    side,
    hp,
    maxHp,
    ap: initialAp,
    maxAp: ctx.config.maxAp,
    apDebt: 0,
    shields: [],
    hand: [],
    deck: shuffle(buildDeck(side === 'player' ? 'P' : 'R', cardCounts), ctx.rng),
    discard: [],
    cardUsage: {},
    turnsTaken: 0,
    crossCheckCharges: 0,
    burdenOfProofActive: false,
    failedChallengesThisTurn: 0,
    claimPool: [...claimPool],
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
    const ordered = [...target.shields].sort((a, b) => {
      if (a.kind === b.kind) return 0;
      return a.kind === 'temporary' ? -1 : 1;
    });
    for (const sh of ordered) {
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

export function getCardUsageCount(c: CharacterState, cardId: CardId): number {
  return c.cardUsage[cardId] ?? 0;
}

export function getCost(c: CharacterState, cardId: CardId, ctx: EngineContext): number {
  const def = ctx.cards[cardId];
  return def.baseCost + getCardUsageCount(c, cardId);
}

export function canAffordDeclaration(c: CharacterState, cardId: CardId, ctx: EngineContext): boolean {
  return c.ap >= getCost(c, cardId, ctx);
}

export function canPlayAnything(c: CharacterState, ctx: EngineContext): boolean {
  return c.hand.length > 0 && c.claimPool.some((id) => canAffordDeclaration(c, id, ctx));
}

export function canChallenge(c: CharacterState, ctx: EngineContext): boolean {
  return c.ap >= ctx.config.challengeMinAp || c.burdenOfProofActive;
}

function pushHistory(state: GameState, entry: Omit<HistoryEntry, 'id' | 'round'>): void {
  state.history.push({ ...entry, id: state.nextId++, round: state.round });
}

function sideLabel(state: GameState, side: Side): string {
  return side === 'player' ? logText().author : reviewerLabel(state.reviewerName);
}

function startTurn(state: GameState, side: Side, ctx: EngineContext): void {
  const c = state[side];
  state.activeSide = side;
  state.phase = side === 'player' ? 'player_turn' : 'reviewer_turn';
  c.failedChallengesThisTurn = 0;

  const L = logText();
  let text = L.turnStart(state.round, sideLabel(state, side));

  if (c.turnsTaken > 0) {
    c.shields = c.shields.filter((sh) => sh.expires !== 'owner_turn_start');
    c.cardUsage = {};
    const { repaid, gained } = gainAp(c, ctx.config.apRecoveryPerTurn);
    const drawn = drawCards(c, ctx.config.drawPerTurn, ctx);
    const parts = [L.turnGainAp(gained)];
    if (repaid > 0) parts.push(L.turnDebtRepaid(repaid));
    parts.push(L.turnDrew(drawn));
    text += ` (${parts.join(L.listSep)})`;
  }
  c.turnsTaken++;
  pushHistory(state, { kind: 'turn', actorSide: side, text });
}

export interface CreateGameOptions {
  reviewerProfile?: ReviewerConfig;
  playerHp?: number;
  playerMaxHp?: number;
  playerDeck?: Partial<Record<CardId, number>>;
  playerClaimPool?: CardId[];
  startingApDelta?: number;
  startingHandDelta?: number;
  startingCrossCheckCharges?: number;
  opponentSuspicionDelta?: number;
}

export function createGame(ctx: EngineContext = makeContext(), options: CreateGameOptions = {}): GameState {
  const {
    reviewerProfile = REVIEWER2_PROFILE,
    playerHp = ctx.config.initialHp,
    playerMaxHp = ctx.config.initialHp,
    playerDeck = PLAYER_BASE_DECK,
    playerClaimPool = [...BASIC_CLAIM_POOL],
    startingApDelta = 0,
    startingHandDelta = 0,
    startingCrossCheckCharges = 0,
    opponentSuspicionDelta = 0,
  } = options;

  const revCfg = reviewerProfile.gameConfig;
  const revCtx = makeContext(revCfg, ctx.rng);

  const playerInitAp = Math.min(ctx.config.maxAp, Math.max(0, ctx.config.initialAp + startingApDelta));
  const playerInitHand = Math.min(ctx.config.handLimit, Math.max(0, ctx.config.initialHandSize + startingHandDelta));

  const reviewerInitSuspicion = Math.max(
    revCfg.suspicion.min,
    Math.min(revCfg.suspicion.max, revCfg.suspicion.initial + opponentSuspicionDelta),
  );

  const player = createCharacter(
    'player',
    playerHp,
    playerMaxHp,
    playerDeck,
    playerClaimPool,
    playerInitAp,
    ctx,
  );

  const reviewer = createCharacter(
    'reviewer',
    revCfg.reviewerHp,
    revCfg.reviewerHp,
    revCfg.deck,
    reviewerProfile.claimPool,
    revCfg.reviewerInitialAp,
    revCtx,
  );

  if (startingCrossCheckCharges > 0) {
    player.crossCheckCharges += startingCrossCheckCharges;
  }

  const state: GameState = {
    phase: 'player_turn',
    round: 1,
    activeSide: 'player',
    player,
    reviewer,
    suspicion: reviewerInitSuspicion,
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
    reviewerMemory: { observedPlayerCards: [], crossCheckRevealedThisPlay: null },
    nextId: 1,
    reviewerName: reviewerProfile.name,
  };

  drawCards(player, playerInitHand, ctx);
  drawCards(reviewer, revCfg.initialHandSize, revCtx);
  pushHistory(state, { kind: 'system', text: logText().gameStart(reviewerLabel(reviewerProfile.name)) });
  startTurn(state, 'player', ctx);
  return state;
}

export function challengeProbability(suspicion: number, config: GameConfig = DEFAULT_CONFIG): number {
  return Math.min(1, Math.max(0, config.aiChallenge.base + config.aiChallenge.perSuspicion * suspicion));
}

export function getPublicPlayInfo(state: GameState): PublicPlayInfo | null {
  const p = state.pendingPlay;
  if (!p) return null;
  return {
    id: p.id,
    actorSide: p.actorSide,
    declaredCardId: p.declaredCardId,
    declaredCost: p.declaredCost,
    crossCheckRevealedCategory: p.crossCheckRevealedCategory,
  };
}

export function declarePlay(
  state: GameState,
  side: Side,
  instanceId: string,
  declaredCardId: CardId,
  ctx: EngineContext = makeContext(),
): ActionResult {
  if (state.result || state.phase === 'game_over') return fail(state, 'Game over');
  const expectedPhase = side === 'player' ? 'player_turn' : 'reviewer_turn';
  if (state.phase !== expectedPhase || state.activeSide !== side) return fail(state, 'Not your turn');
  if (state.pendingPlay) return fail(state, 'Already a pending play');

  const s = clone(state);
  const c = s[side];

  if (!c.claimPool.includes(declaredCardId)) return fail(state, 'Card not in claim pool');
  if (!CARD_IDS.includes(declaredCardId)) return fail(state, 'Invalid card id');

  const idx = c.hand.findIndex((h) => h.instanceId === instanceId);
  if (idx < 0) return fail(state, 'Card not in hand');

  const declaredCost = getCost(c, declaredCardId, ctx);
  if (c.ap < declaredCost) return fail(state, 'Not enough AP');

  const [card] = c.hand.splice(idx, 1);
  const actualCostSnapshot = getCost(c, card.cardId, ctx);
  spendAp(c, declaredCost);
  c.cardUsage[declaredCardId] = (c.cardUsage[declaredCardId] ?? 0) + 1;

  const responderSide = opponentOf(side);
  const responder = s[responderSide];

  let crossCheckRevealedCategory: Category | null = null;
  if (responder.crossCheckCharges > 0) {
    responder.crossCheckCharges--;
    crossCheckRevealedCategory = ctx.cards[card.cardId].category;
    s.reviewerMemory = { ...s.reviewerMemory, crossCheckRevealedThisPlay: crossCheckRevealedCategory };
  } else {
    s.reviewerMemory = { ...s.reviewerMemory, crossCheckRevealedThisPlay: null };
  }

  const pending: PendingPlay = {
    id: s.nextId++,
    actorSide: side,
    actualCardInstanceId: card.instanceId,
    actualCardId: card.cardId,
    declaredCardId,
    declaredCost,
    actualCostSnapshot,
    challengeStatus: 'pending',
    crossCheckRevealedCategory,
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

function describeDelta(name: string, d: SideDelta): string {
  const L = logText();
  const parts: string[] = [];
  if (d.hp) parts.push(L.deltaHp(d.hp));
  if (d.ap) parts.push(L.deltaAp(d.ap));
  if (d.apDebt) parts.push(L.deltaDebt(d.apDebt));
  if (d.shield) parts.push(L.deltaShield(d.shield));
  return parts.length ? L.deltaLine(name, parts) : '';
}

export function respondToPlay(
  state: GameState,
  challenge: boolean,
  ctx: EngineContext = makeContext(),
): ActionResult {
  if (state.result || state.phase === 'game_over') return fail(state, 'Game over');
  const p = state.pendingPlay;
  if (!p) return fail(state, 'No pending play');
  const expectedPhase = p.actorSide === 'player' ? 'awaiting_reviewer_challenge' : 'awaiting_player_challenge';
  if (state.phase !== expectedPhase) return fail(state, 'Wrong phase');
  const responderSide = opponentOf(p.actorSide);

  if (challenge && !canChallenge(state[responderSide], ctx)) return fail(state, 'Not enough AP to challenge');

  const s = clone(state);
  s.phase = 'resolving_action';
  const pending = s.pendingPlay!;
  const actor = s[pending.actorSide];
  const resp = s[responderSide];
  const before = { player: snapshot(s.player), reviewer: snapshot(s.reviewer) };
  const { config } = ctx;

  const isTruthful = pending.actualCardId === pending.declaredCardId;
  let executed: CardId = pending.declaredCardId;
  let extraCost = 0;
  let usedBurdenOfProof = false;

  if (!challenge) {
    pending.challengeStatus = 'accepted';
    if (pending.actorSide === 'player' && !isTruthful) s.stats.playerSuccessfulBluffs++;
  } else if (!isTruthful) {
    pending.challengeStatus = 'challenge_success';
    const usingBurden = resp.burdenOfProofActive && resp.ap < config.challengeMinAp;
    if (usingBurden) {
      usedBurdenOfProof = true;
      resp.burdenOfProofActive = false;
      gainAp(resp, config.burdenOfProofChallengeReward);
    } else {
      gainAp(resp, config.challengeReward);
    }
    extraCost = Math.max(0, pending.actualCostSnapshot - pending.declaredCost) + config.bluffCaughtPenalty;
    spendAp(actor, extraCost);
    actor.cardUsage[pending.actualCardId] = (actor.cardUsage[pending.actualCardId] ?? 0) + 1;
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
    resp.failedChallengesThisTurn++;
    const usingBurden = resp.burdenOfProofActive && resp.ap < config.challengeMinAp;
    if (usingBurden) {
      usedBurdenOfProof = true;
      resp.burdenOfProofActive = false;
    } else {
      spendAp(resp, config.challengeFailPenalty);
    }
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
    usedBurdenOfProof,
    deltas: { player: before.player, reviewer: before.reviewer },
  };

  const effect = ctx.cards[executed].effect;
  const target = s[opponentOf(pending.actorSide)];
  const L = logText();
  const actorLabel = sideLabel(s, pending.actorSide);
  const targetLabel = sideLabel(s, target.side);
  const effectParts: string[] = [];

  switch (effect.kind) {
    case 'damage': {
      const r = applyDamage(target, effect.amount, effect.pierce);
      resolution.damage = { target: target.side, ...r, pierce: effect.pierce };
      effectParts.push(
        r.absorbed > 0
          ? L.shieldAbsorbed(r.absorbed, targetLabel, r.hpLoss)
          : L.lostHp(targetLabel, r.hpLoss, effect.pierce, false),
      );
      break;
    }
    case 'damage_conditional': {
      let dmgAmount = effect.baseAmount;
      let triggeredBonus = false;
      if (effect.condition === 'opponent_failed_challenge_this_turn') {
        if (target.failedChallengesThisTurn > 0) {
          dmgAmount += effect.bonusAmount;
          triggeredBonus = true;
        }
      } else if (effect.condition === 'self_bluff_caught') {
        if (pending.challengeStatus === 'challenge_success' && pending.actualCardId === 'red_herring') {
          dmgAmount += effect.bonusAmount;
          triggeredBonus = true;
        }
      }
      const r = applyDamage(target, dmgAmount, false);
      resolution.damage = { target: target.side, ...r, pierce: false };
      effectParts.push(L.lostHp(targetLabel, r.hpLoss, false, triggeredBonus));
      break;
    }
    case 'shield': {
      const kind = effect.permanent ? 'permanent' : 'temporary';
      const expires = effect.permanent ? ('never' as const) : ('owner_turn_start' as const);
      actor.shields.push({ id: `sh-${s.nextId++}`, amount: effect.amount, kind, expires });
      if (effect.permanent) resolution.permanentShieldGained = effect.amount;
      else resolution.shieldGained = effect.amount;
      effectParts.push(L.gainedShield(actorLabel, effect.amount, effect.permanent));
      break;
    }
    case 'draw': {
      const n = drawCards(actor, effect.amount, ctx);
      resolution.cardsDrawn = n;
      effectParts.push(L.drewCards(actorLabel, n));
      break;
    }
    case 'gain_ap': {
      const r = gainAp(actor, effect.amount);
      resolution.apGained = r.gained;
      resolution.apDebtRepaid = r.repaid;
      effectParts.push(L.recoveredAp(actorLabel, r.gained, r.repaid));
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
      effectParts.push(peeked ? L.peeked(actorLabel) : L.nothingToPeek);
      break;
    }
    case 'cross_check': {
      actor.crossCheckCharges++;
      resolution.crossCheckGranted = true;
      effectParts.push(L.gainedCrossCheck(actorLabel));
      break;
    }
    case 'burden_of_proof': {
      if (!actor.burdenOfProofActive) {
        actor.burdenOfProofActive = true;
        resolution.burdenOfProofGranted = true;
        effectParts.push(L.gainedBurden(actorLabel));
      } else {
        effectParts.push(L.burdenAlready);
      }
      break;
    }
  }

  resolution.deltas = {
    player: diff(before.player, snapshot(s.player)),
    reviewer: diff(before.reviewer, snapshot(s.reviewer)),
  };

  const result = checkHpResult(s);
  actor.discard.push({ instanceId: pending.actualCardInstanceId, cardId: pending.actualCardId });

  const declaredName = cardName(pending.declaredCardId);
  const respName = sideLabel(s, responderSide);
  let head = L.declares(actorLabel, declaredName);
  if (!challenge) head += L.accepts(respName);
  else if (pending.challengeStatus === 'challenge_success')
    head += L.bluffCaught(respName, cardName(pending.actualCardId), extraCost);
  else head += L.falseAccusation(respName, declaredName);

  const deltaText = (['player', 'reviewer'] as Side[])
    .map((sd) => describeDelta(sideLabel(s, sd), resolution.deltas[sd]))
    .filter(Boolean)
    .join('; ');

  pushHistory(s, {
    kind: 'play',
    actorSide: pending.actorSide,
    declaredCardId: pending.declaredCardId,
    challenged: challenge,
    challengeCorrect: challenge ? pending.challengeStatus === 'challenge_success' : undefined,
    revealedCardId: resolution.revealedCardId,
    executedCardId: executed,
    deltas: resolution.deltas,
    text: L.playLine(head, effectParts, deltaText),
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
  const L = logText();
  pushHistory(s, { kind: 'system', text: L.battleOver(L.outcome[result.outcome]) });
}

export function deadlineOutcome(playerHp: number, reviewerHp: number): GameResult {
  if (playerHp > reviewerHp) return { outcome: 'accept', reason: 'deadline', winner: 'player' };
  if (playerHp === reviewerHp) return { outcome: 'weak_accept', reason: 'deadline', winner: null };
  return { outcome: 'reject', reason: 'deadline', winner: 'reviewer' };
}

export function endTurn(state: GameState, side: Side, ctx: EngineContext = makeContext()): ActionResult {
  if (state.result || state.phase === 'game_over') return fail(state, 'Game over');
  const expectedPhase = side === 'player' ? 'player_turn' : 'reviewer_turn';
  if (state.phase !== expectedPhase || state.activeSide !== side) return fail(state, 'Cannot end turn now');
  if (state.pendingPlay) return fail(state, 'Pending play');

  const s = clone(state);
  s.lastResolution = null;
  pushHistory(s, { kind: 'system', actorSide: side, text: logText().endsTurn(sideLabel(s, side)) });

  const opSide = opponentOf(side);
  const opponent = s[opSide];
  if (opponent.burdenOfProofActive) {
    opponent.burdenOfProofActive = false;
  }

  if (side === 'player') {
    startTurn(s, 'reviewer', ctx);
  } else if (s.round >= ctx.config.maxRounds) {
    pushHistory(s, { kind: 'system', text: logText().deadline });
    finishGame(s, deadlineOutcome(s.player.hp, s.reviewer.hp));
  } else {
    s.round++;
    startTurn(s, 'player', ctx);
  }
  return { ok: true, state: s };
}
