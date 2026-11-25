import { DEFAULT_CONFIG, type GameConfig } from './config';
import type { CardDefinition, CardId, CardInstance, Category } from './types';

export const BASIC_CARD_IDS: CardId[] = [
  'argument',
  'critical_point',
  'evidence',
  'strong_evidence',
  'additional_experiment',
  'revision',
  'investigation',
];

export const ADVANCED_CARD_IDS: CardId[] = [
  'counterargument',
  'red_herring',
  'prior_work',
  'cross_check',
  'burden_of_proof',
];

export const CARD_IDS: CardId[] = [...BASIC_CARD_IDS, ...ADVANCED_CARD_IDS];

export function buildCardDefinitions(config: GameConfig = DEFAULT_CONFIG): Record<CardId, CardDefinition> {
  const v = config.cardValues;
  return {
    argument: {
      id: 'argument',
      name: 'Argument',
      category: 'attack',
      description: `Deal ${v.argumentDamage} damage`,
      flavor: '"As clearly shown in Table 3..."',
      effect: { kind: 'damage', amount: v.argumentDamage, pierce: false },
      artwork: 'argument',
      baseCost: 1,
      isAdvanced: false,
    },
    critical_point: {
      id: 'critical_point',
      name: 'Critical Point',
      category: 'attack',
      description: `Deal ${v.criticalDamage} piercing damage (ignores shields)`,
      flavor: '"This invalidates your main claim."',
      effect: { kind: 'damage', amount: v.criticalDamage, pierce: true },
      artwork: 'critical_point',
      baseCost: 1,
      isAdvanced: false,
    },
    evidence: {
      id: 'evidence',
      name: 'Evidence',
      category: 'defense',
      description: `Gain ${v.evidenceShield} shield`,
      flavor: '"See supplementary material."',
      effect: { kind: 'shield', amount: v.evidenceShield, permanent: false },
      artwork: 'evidence',
      baseCost: 1,
      isAdvanced: false,
    },
    strong_evidence: {
      id: 'strong_evidence',
      name: 'Strong Evidence',
      category: 'defense',
      description: `Gain ${v.strongEvidenceShield} shield`,
      flavor: '"p < 0.001 across 5 seeds."',
      effect: { kind: 'shield', amount: v.strongEvidenceShield, permanent: false },
      artwork: 'strong_evidence',
      baseCost: 1,
      isAdvanced: false,
    },
    additional_experiment: {
      id: 'additional_experiment',
      name: 'Additional Experiment',
      category: 'utility',
      description: `Draw ${v.experimentDraw} cards`,
      flavor: '"We ran it overnight on 8 GPUs."',
      effect: { kind: 'draw', amount: v.experimentDraw },
      artwork: 'additional_experiment',
      baseCost: 1,
      isAdvanced: false,
    },
    revision: {
      id: 'revision',
      name: 'Revision',
      category: 'utility',
      description: `Recover ${v.revisionAp} AP`,
      flavor: '"We have revised Section 4 accordingly."',
      effect: { kind: 'gain_ap', amount: v.revisionAp },
      artwork: 'revision',
      baseCost: 1,
      isAdvanced: false,
    },
    investigation: {
      id: 'investigation',
      name: 'Investigation',
      category: 'utility',
      description: `Peek at ${v.investigationPeek} random card in opponent's hand`,
      flavor: '"Let me check your GitHub repo."',
      effect: { kind: 'peek', amount: v.investigationPeek },
      artwork: 'investigation',
      baseCost: 1,
      isAdvanced: false,
    },
    counterargument: {
      id: 'counterargument',
      name: 'Counterargument',
      category: 'attack',
      description: 'Deal 1 damage. If your opponent failed a challenge earlier this turn, deal 1 additional damage.',
      flavor: '"This contradicts your previous claim."',
      effect: { kind: 'damage_conditional', baseAmount: 1, bonusAmount: 1, condition: 'opponent_failed_challenge_this_turn' },
      artwork: 'counterargument',
      baseCost: 1,
      isAdvanced: true,
    },
    red_herring: {
      id: 'red_herring',
      name: 'Red Herring',
      category: 'attack',
      description: 'Deal 1 damage. If this is your actual card and your bluff is caught, deal 1 additional damage instead.',
      flavor: '"That is not what I meant."',
      effect: { kind: 'damage_conditional', baseAmount: 1, bonusAmount: 1, condition: 'self_bluff_caught' },
      artwork: 'red_herring',
      baseCost: 1,
      isAdvanced: true,
    },
    prior_work: {
      id: 'prior_work',
      name: 'Prior Work',
      category: 'defense',
      description: 'Gain 1 permanent shield. Persists between turns (removed at end of combat).',
      flavor: '"As clearly established in prior literature..."',
      effect: { kind: 'shield', amount: 1, permanent: true },
      artwork: 'prior_work',
      baseCost: 1,
      isAdvanced: true,
    },
    cross_check: {
      id: 'cross_check',
      name: 'Cross-check',
      category: 'utility',
      description: "Gain 1 Cross-check charge. Reveals the category of opponent's next actual card before you decide to challenge.",
      flavor: '"Let me verify your experimental setup."',
      effect: { kind: 'cross_check' },
      artwork: 'cross_check',
      baseCost: 1,
      isAdvanced: true,
    },
    burden_of_proof: {
      id: 'burden_of_proof',
      name: 'Burden of Proof',
      category: 'utility',
      description: "During opponent's next turn, challenge once at 0 AP. Failed challenge costs nothing; successful grants 2 AP.",
      flavor: '"The burden of proof lies with the claimant."',
      effect: { kind: 'burden_of_proof' },
      artwork: 'burden_of_proof',
      baseCost: 1,
      isAdvanced: true,
    },
  };
}

export const CARDS: Record<CardId, CardDefinition> = buildCardDefinitions();

export const CATEGORY_LABEL: Record<Category, string> = {
  attack: 'Attack',
  defense: 'Defense',
  utility: 'Utility',
};

export function categoryOf(cardId: CardId, defs: Record<CardId, CardDefinition> = CARDS): Category {
  return defs[cardId].category;
}

export function buildDeck(prefix: string, cardCounts: Partial<Record<CardId, number>>): CardInstance[] {
  const deck: CardInstance[] = [];
  let n = 0;
  for (const id of CARD_IDS) {
    const count = cardCounts[id] ?? 0;
    for (let i = 0; i < count; i++) {
      deck.push({ instanceId: `${prefix}-${id}-${n++}`, cardId: id });
    }
  }
  return deck;
}

export const PLAYER_BASE_DECK: Partial<Record<CardId, number>> = {
  argument: 2,
  critical_point: 1,
  evidence: 2,
  strong_evidence: 1,
  additional_experiment: 1,
  revision: 2,
  investigation: 1,
};

export const BASIC_CLAIM_POOL: CardId[] = [...BASIC_CARD_IDS];

export function buildCardDefinitionsLegacy(_config: GameConfig = DEFAULT_CONFIG): Record<CardId, CardDefinition> {
  return buildCardDefinitions(_config);
}
