import { CARD_IDS } from './cards';
import { canChallenge, challengeProbability, getCost, getPublicPlayInfo, totalShield, type EngineContext } from './engine';
import type { CardId, CardInstance, CharacterState, GameState, PublicPlayInfo, ReviewerMemory } from './types';

export interface ChallengeView {
  play: PublicPlayInfo;
  suspicion: number;
  reviewerAp: number;
}

export function buildChallengeView(state: GameState): ChallengeView | null {
  const play = getPublicPlayInfo(state);
  if (!play || play.actorSide !== 'player') return null;
  return { play, suspicion: state.suspicion, reviewerAp: state.reviewer.ap };
}

export function decideReviewerChallenge(view: ChallengeView, ctx: EngineContext): boolean {
  if (view.reviewerAp < ctx.config.challengeMinAp) return false;
  const r = ctx.rng();
  return r < challengeProbability(view.suspicion, ctx.config);
}

export interface OpponentPublic {
  hp: number;
  ap: number;
  apDebt: number;
  shield: number;
  handCount: number;
}

export interface ReviewerView {
  self: CharacterState;
  opponent: OpponentPublic;
  memory: ReviewerMemory;
  round: number;
}

export function buildReviewerView(state: GameState): ReviewerView {
  const p = state.player;
  return {
    self: JSON.parse(JSON.stringify(state.reviewer)) as CharacterState,
    opponent: { hp: p.hp, ap: p.ap, apDebt: p.apDebt, shield: totalShield(p), handCount: p.hand.length },
    memory: state.reviewerMemory,
    round: state.round,
  };
}

export type ReviewerAction =
  | { type: 'play'; instanceId: string; declaredCardId: CardId; bluff: boolean }
  | { type: 'end' };

function isLethal(cardId: CardId, view: ReviewerView, ctx: EngineContext): boolean {
  const eff = ctx.cards[cardId].effect;
  if (eff.kind !== 'damage') return false;
  const effective = eff.pierce ? eff.amount : Math.max(0, eff.amount - view.opponent.shield);
  return effective >= view.opponent.hp;
}

export function cardValue(cardId: CardId, view: ReviewerView, ctx: EngineContext): number {
  const { self, opponent } = view;
  const myShield = totalShield(self);
  const cfg = ctx.config;
  if (isLethal(cardId, view, ctx)) return 100;
  switch (cardId) {
    case 'argument':
      return opponent.shield > 0 ? 2.5 : 6;
    case 'critical_point':
      return opponent.shield > 0 ? 8 : 6.5;
    case 'evidence':
    case 'strong_evidence': {
      const bonus = cardId === 'strong_evidence' ? 1 : 0;
      if (self.hp <= 2 && myShield < 2) return 7 + bonus;
      if (myShield >= 3) return 0.5;
      if (myShield >= 1) return 2 + bonus * 0.5;
      return 3.5 + bonus;
    }
    case 'additional_experiment':
      if (self.hand.length >= cfg.handLimit - 1) return 0.3;
      if (self.hand.length <= 2) return 5;
      return 2.5;
    case 'revision':
      if (self.ap >= self.maxAp - 1) return 0.3;
      if (self.ap <= 2 && self.hand.length >= 2) return 4.5;
      return 1.5;
    case 'investigation':
      return opponent.handCount > 0 ? 1.4 : 0.1;
  }
}

function weightedPick<T>(items: { item: T; weight: number }[], rng: () => number): T | undefined {
  const valid = items.filter((i) => i.weight > 0);
  const total = valid.reduce((s, i) => s + i.weight, 0);
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (const i of valid) {
    r -= i.weight;
    if (r <= 0) return i.item;
  }
  return valid[valid.length - 1].item;
}

function topChoices<T extends { value: number }>(list: T[], n: number): T[] {
  return list.slice().sort((a, b) => b.value - a.value).slice(0, n);
}

export function decideReviewerAction(view: ReviewerView, ctx: EngineContext): ReviewerAction {
  const { self, opponent } = view;
  const rng = ctx.rng;
  if (self.hand.length === 0) return { type: 'end' };

  const affordable = CARD_IDS.filter((id) => self.ap >= getCost(self, id, ctx));
  if (affordable.length === 0) return { type: 'end' };

  const valued = (id: CardId) => cardValue(id, view, ctx);

  const truthful = self.hand
    .filter((c) => affordable.includes(c.cardId))
    .map((c) => ({ card: c, value: valued(c.cardId), cost: getCost(self, c.cardId, ctx) }));

  const bluffProb = opponent.ap === 0 ? ctx.config.aiBluff.whenPlayerApZero : ctx.config.aiBluff.otherwise;
  const wantsBluff = rng() < bluffProb;

  let choice: { card: CardInstance; declared: CardId; value: number; cost: number; bluff: boolean } | null = null;

  const bestTruth = topChoices(truthful, 1)[0];

  if (wantsBluff) {
    const claims = affordable.map((id) => ({ id, value: valued(id), cost: getCost(self, id, ctx) }));
    const top = topChoices(claims, 3);
    const declared = weightedPick(
      top.map((c, i) => ({ item: c, weight: Math.max(0.1, c.value) * (i === 0 ? 1.6 : 1) })),
      rng,
    );
    if (declared) {
      const fodder = self.hand
        .filter((c) => c.cardId !== declared.id)
        .map((c) => ({ card: c, value: valued(c.cardId) }))
        .sort((a, b) => a.value - b.value);
      const actual = fodder[0];
      const worthIt = actual && declared.value > actual.value + 0.5 && (!bestTruth || declared.value >= bestTruth.value);
      if (actual && worthIt) {
        choice = { card: actual.card, declared: declared.id, value: declared.value, cost: declared.cost, bluff: true };
      }
    }
  }

  if (!choice && truthful.length > 0) {
    const top = topChoices(truthful, 2);
    const pick =
      top.length > 1 && top[1].value > top[0].value * 0.7 && rng() < 0.3 ? top[1] : top[0];
    choice = { card: pick.card, declared: pick.card.cardId, value: pick.value, cost: pick.cost, bluff: false };
  }

  if (!choice) return { type: 'end' };

  if (choice.value < 1 && rng() < 0.8) return { type: 'end' };

  const lethal = choice.value >= 100;
  const remaining = self.ap - choice.cost;
  const playerCanAct = opponent.handCount > 0;
  const restoresAp = choice.declared === 'revision';
  if (!lethal && !restoresAp && remaining < ctx.config.challengeMinAp && playerCanAct) {
    const greatOpportunity = choice.value >= 7;
    const reserveProb = greatOpportunity ? ctx.config.aiReserveApProbability * 0.4 : ctx.config.aiReserveApProbability;
    if (rng() < reserveProb) return { type: 'end' };
  }

  return { type: 'play', instanceId: choice.card.instanceId, declaredCardId: choice.declared, bluff: choice.bluff };
}

export function canReviewerChallenge(state: GameState, ctx: EngineContext): boolean {
  return canChallenge(state.reviewer, ctx);
}
