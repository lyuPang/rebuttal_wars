import { CARD_IDS } from './cards';
import { canChallenge, challengeProbability, getCost, getPublicPlayInfo, totalShield, type EngineContext } from './engine';
import type { CardId, CardInstance, Category, CharacterState, GameState, PublicPlayInfo, ReviewerMemory } from './types';

export interface ChallengeView {
  play: PublicPlayInfo;
  suspicion: number;
  reviewerAp: number;
  crossCheckRevealedCategory: Category | null;
  reviewerHasBurdenOfProof: boolean;
}

export function buildChallengeView(state: GameState): ChallengeView | null {
  const play = getPublicPlayInfo(state);
  if (!play || play.actorSide !== 'player') return null;
  return {
    play,
    suspicion: state.suspicion,
    reviewerAp: state.reviewer.ap,
    crossCheckRevealedCategory: play.crossCheckRevealedCategory,
    reviewerHasBurdenOfProof: state.reviewer.burdenOfProofActive,
  };
}

export function decideReviewerChallenge(view: ChallengeView, ctx: EngineContext): boolean {
  const mockChar = { ap: view.reviewerAp, burdenOfProofActive: view.reviewerHasBurdenOfProof } as CharacterState;
  if (!canChallenge(mockChar, ctx)) return false;

  if (view.crossCheckRevealedCategory !== null) {
    const declaredCategory = ctx.cards[view.play.declaredCardId].category;
    if (view.crossCheckRevealedCategory !== declaredCategory) {
      return true;
    }
  }

  const r = ctx.rng();
  return r < challengeProbability(view.suspicion, ctx.config);
}

export interface OpponentPublic {
  hp: number;
  ap: number;
  apDebt: number;
  shield: number;
  handCount: number;
  burdenOfProofActive: boolean;
  failedChallengesThisTurn: number;
}

export interface ReviewerView {
  self: CharacterState;
  opponent: OpponentPublic;
  memory: ReviewerMemory;
  round: number;
  attackWeight: number;
  defenseWeight: number;
  utilityWeight: number;
}

export function buildReviewerView(state: GameState, ctx: EngineContext): ReviewerView {
  const p = state.player;
  return {
    self: JSON.parse(JSON.stringify(state.reviewer)) as CharacterState,
    opponent: {
      hp: p.hp,
      ap: p.ap,
      apDebt: p.apDebt,
      shield: totalShield(p),
      handCount: p.hand.length,
      burdenOfProofActive: p.burdenOfProofActive,
      failedChallengesThisTurn: p.failedChallengesThisTurn,
    },
    memory: state.reviewerMemory,
    round: state.round,
    attackWeight: ctx.config.attackWeight,
    defenseWeight: ctx.config.defenseWeight,
    utilityWeight: ctx.config.utilityWeight,
  };
}

export type ReviewerAction =
  | { type: 'play'; instanceId: string; declaredCardId: CardId; bluff: boolean }
  | { type: 'end' };

function isLethal(cardId: CardId, view: ReviewerView, ctx: EngineContext): boolean {
  const eff = ctx.cards[cardId].effect;
  if (eff.kind === 'damage') {
    const effective = eff.pierce ? eff.amount : Math.max(0, eff.amount - view.opponent.shield);
    return effective >= view.opponent.hp;
  }
  if (eff.kind === 'damage_conditional') {
    const max = eff.baseAmount + eff.bonusAmount;
    const effective = Math.max(0, max - view.opponent.shield);
    return effective >= view.opponent.hp;
  }
  return false;
}

export function cardValue(cardId: CardId, view: ReviewerView, ctx: EngineContext): number {
  const { self, opponent } = view;
  const myShield = totalShield(self);
  const cfg = ctx.config;
  if (isLethal(cardId, view, ctx)) return 100;

  const atkMul = view.attackWeight;
  const defMul = view.defenseWeight;
  const utilMul = view.utilityWeight;

  switch (cardId) {
    case 'argument':
      return (opponent.shield > 0 ? 2.5 : 6) * atkMul;
    case 'critical_point':
      return (opponent.shield > 0 ? 8 : 6.5) * atkMul;
    case 'evidence':
    case 'strong_evidence': {
      const bonus = cardId === 'strong_evidence' ? 1 : 0;
      if (self.hp <= 2 && myShield < 2) return (7 + bonus) * defMul;
      if (myShield >= 3) return 0.5 * defMul;
      if (myShield >= 1) return (2 + bonus * 0.5) * defMul;
      return (3.5 + bonus) * defMul;
    }
    case 'additional_experiment':
      if (self.hand.length >= cfg.handLimit - 1) return 0.3 * utilMul;
      if (self.hand.length <= 2) return 5 * utilMul;
      return 2.5 * utilMul;
    case 'revision':
      if (self.ap >= self.maxAp - 1) return 0.3 * utilMul;
      if (self.ap <= 2 && self.hand.length >= 2) return 4.5 * utilMul;
      return 1.5 * utilMul;
    case 'investigation':
      return (opponent.handCount > 0 ? 1.4 : 0.1) * utilMul;
    case 'counterargument': {
      const baseVal = opponent.shield > 0 ? 2.5 : 6;
      const bonus = opponent.failedChallengesThisTurn > 0 ? 4 : 0;
      return (baseVal + bonus) * atkMul;
    }
    case 'red_herring':
      return (opponent.shield > 0 ? 2 : 5) * atkMul;
    case 'prior_work': {
      const permShield = self.shields.filter((s) => s.kind === 'permanent').reduce((a, s) => a + s.amount, 0);
      if (permShield >= 3) return 0.5 * defMul;
      if (self.hp <= 3) return 6 * defMul;
      return 3.5 * defMul;
    }
    case 'cross_check': {
      if (self.crossCheckCharges >= 2) return 0.5 * utilMul;
      return (opponent.handCount > 0 ? 2.5 : 0.5) * utilMul;
    }
    case 'burden_of_proof': {
      if (self.burdenOfProofActive) return 0.1 * utilMul;
      return 1.5 * utilMul;
    }
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

  const affordable = self.claimPool.filter((id) => self.ap >= getCost(self, id, ctx));
  if (affordable.length === 0) return { type: 'end' };

  const valued = (id: CardId) => cardValue(id, view, ctx);

  const truthful = self.hand
    .filter((c) => affordable.includes(c.cardId))
    .map((c) => ({ card: c, value: valued(c.cardId), cost: getCost(self, c.cardId, ctx) }));

  const playerCanChallenge = opponent.ap >= ctx.config.challengeMinAp || opponent.burdenOfProofActive;
  const bluffProb = playerCanChallenge ? ctx.config.aiBluff.otherwise : ctx.config.aiBluff.whenPlayerApZero;
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
      const fodderList = self.hand
        .filter((c) => c.cardId !== declared.id)
        .map((c) => ({ card: c, value: valued(c.cardId) }))
        .sort((a, b) => a.value - b.value);

      const fodder = fodderList[0];
      const worthIt = fodder && declared.value > fodder.value + 0.5 && (!bestTruth || declared.value >= bestTruth.value);
      if (fodder && worthIt) {
        choice = { card: fodder.card, declared: declared.id, value: declared.value, cost: declared.cost, bluff: true };
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
  const restoresAp = choice.declared === 'revision';
  if (!lethal && !restoresAp && remaining < ctx.config.challengeMinAp && playerCanChallenge) {
    const greatOpportunity = choice.value >= 7;
    const reserveProb = greatOpportunity ? ctx.config.aiReserveApProbability * 0.4 : ctx.config.aiReserveApProbability;
    if (rng() < reserveProb) return { type: 'end' };
  }

  return { type: 'play', instanceId: choice.card.instanceId, declaredCardId: choice.declared, bluff: choice.bluff };
}

export function canReviewerChallenge(state: GameState, ctx: EngineContext): boolean {
  return canChallenge(state.reviewer, ctx);
}

void CARD_IDS;
