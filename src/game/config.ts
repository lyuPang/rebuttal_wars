import type { CardId } from './types';

export interface GameConfig {
  initialHp: number;
  initialAp: number;
  maxAp: number;
  apRecoveryPerTurn: number;
  initialHandSize: number;
  handLimit: number;
  drawPerTurn: number;
  maxRounds: number;
  challengeMinAp: number;
  challengeReward: number;
  challengeFailPenalty: number;
  bluffCaughtPenalty: number;
  suspicion: {
    min: number;
    max: number;
    initial: number;
    onCatchBluff: number;
    onFalseAccusation: number;
  };
  aiChallenge: {
    base: number;
    perSuspicion: number;
  };
  aiBluff: {
    whenPlayerApZero: number;
    otherwise: number;
  };
  aiReserveApProbability: number;
  cardValues: {
    argumentDamage: number;
    criticalDamage: number;
    evidenceShield: number;
    strongEvidenceShield: number;
    experimentDraw: number;
    revisionAp: number;
    investigationPeek: number;
  };
  deck: Record<CardId, number>;
}

export const DEFAULT_CONFIG: GameConfig = {
  initialHp: 5,
  initialAp: 3,
  maxAp: 5,
  apRecoveryPerTurn: 3,
  initialHandSize: 4,
  handLimit: 6,
  drawPerTurn: 2,
  maxRounds: 6,
  challengeMinAp: 1,
  challengeReward: 1,
  challengeFailPenalty: 1,
  bluffCaughtPenalty: 1,
  suspicion: {
    min: 0,
    max: 5,
    initial: 2,
    onCatchBluff: 2,
    onFalseAccusation: -1,
  },
  aiChallenge: {
    base: 0.15,
    perSuspicion: 0.12,
  },
  aiBluff: {
    whenPlayerApZero: 0.65,
    otherwise: 0.3,
  },
  aiReserveApProbability: 0.75,
  cardValues: {
    argumentDamage: 1,
    criticalDamage: 1,
    evidenceShield: 1,
    strongEvidenceShield: 2,
    experimentDraw: 2,
    revisionAp: 2,
    investigationPeek: 1,
  },
  deck: {
    argument: 4,
    critical_point: 2,
    evidence: 4,
    strong_evidence: 2,
    additional_experiment: 3,
    revision: 3,
    investigation: 2,
  },
};
