import { DEFAULT_CONFIG, type GameConfig } from './config';
import type { CardDefinition, CardId, CardInstance, Category } from './types';

export const CARD_IDS: CardId[] = [
  'argument',
  'critical_point',
  'evidence',
  'strong_evidence',
  'additional_experiment',
  'revision',
  'investigation',
];

export function buildCardDefinitions(config: GameConfig = DEFAULT_CONFIG): Record<CardId, CardDefinition> {
  const v = config.cardValues;
  return {
    argument: {
      id: 'argument',
      name: 'Argument',
      category: 'attack',
      description: `造成 ${v.argumentDamage} 点普通伤害`,
      flavor: '"As clearly shown in Table 3..."',
      effect: { kind: 'damage', amount: v.argumentDamage, pierce: false },
      artwork: 'argument',
      baseCost: 1,
    },
    critical_point: {
      id: 'critical_point',
      name: 'Critical Point',
      category: 'attack',
      description: `造成 ${v.criticalDamage} 点穿透伤害（无视护盾）`,
      flavor: '"This invalidates your main claim."',
      effect: { kind: 'damage', amount: v.criticalDamage, pierce: true },
      artwork: 'critical_point',
      baseCost: 1,
    },
    evidence: {
      id: 'evidence',
      name: 'Evidence',
      category: 'defense',
      description: `获得 ${v.evidenceShield} 点护盾`,
      flavor: '"See supplementary material."',
      effect: { kind: 'shield', amount: v.evidenceShield },
      artwork: 'evidence',
      baseCost: 1,
    },
    strong_evidence: {
      id: 'strong_evidence',
      name: 'Strong Evidence',
      category: 'defense',
      description: `获得 ${v.strongEvidenceShield} 点护盾`,
      flavor: '"p < 0.001 across 5 seeds."',
      effect: { kind: 'shield', amount: v.strongEvidenceShield },
      artwork: 'strong_evidence',
      baseCost: 1,
    },
    additional_experiment: {
      id: 'additional_experiment',
      name: 'Additional Experiment',
      category: 'utility',
      description: `从牌库抽 ${v.experimentDraw} 张牌`,
      flavor: '"We ran it overnight on 8 GPUs."',
      effect: { kind: 'draw', amount: v.experimentDraw },
      artwork: 'additional_experiment',
      baseCost: 1,
    },
    revision: {
      id: 'revision',
      name: 'Revision',
      category: 'utility',
      description: `恢复 ${v.revisionAp} AP`,
      flavor: '"We have revised Section 4 accordingly."',
      effect: { kind: 'gain_ap', amount: v.revisionAp },
      artwork: 'revision',
      baseCost: 1,
    },
    investigation: {
      id: 'investigation',
      name: 'Investigation',
      category: 'utility',
      description: `随机查看对方 ${v.investigationPeek} 张手牌`,
      flavor: '"Let me check your GitHub repo."',
      effect: { kind: 'peek', amount: v.investigationPeek },
      artwork: 'investigation',
      baseCost: 1,
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

export function buildDeck(prefix: string, config: GameConfig = DEFAULT_CONFIG): CardInstance[] {
  const deck: CardInstance[] = [];
  let n = 0;
  for (const id of CARD_IDS) {
    const count = config.deck[id] ?? 0;
    for (let i = 0; i < count; i++) {
      deck.push({ instanceId: `${prefix}-${id}-${n++}`, cardId: id });
    }
  }
  return deck;
}
