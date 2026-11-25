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
  burdenOfProofChallengeReward: number;
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
  deck: Partial<Record<CardId, number>>;
  reviewerHp: number;
  reviewerInitialAp: number;
  attackWeight: number;
  defenseWeight: number;
  utilityWeight: number;
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
  burdenOfProofChallengeReward: 2,
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
    whenPlayerApZero: 0.8,
    otherwise: 0.4,
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
    argument: 3,
    critical_point: 2,
    evidence: 1,
    strong_evidence: 1,
    additional_experiment: 1,
    revision: 1,
    investigation: 1,
    red_herring: 1,
    counterargument: 1,
  },
  reviewerHp: 6,
  reviewerInitialAp: 3,
  attackWeight: 1.5,
  defenseWeight: 0.8,
  utilityWeight: 1.0,
};

export const REVIEWER1_CONFIG: GameConfig = {
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
  burdenOfProofChallengeReward: 2,
  suspicion: {
    min: 0,
    max: 5,
    initial: 3,
    onCatchBluff: 2,
    onFalseAccusation: -1,
  },
  aiChallenge: {
    base: 0.15,
    perSuspicion: 0.12,
  },
  aiBluff: {
    whenPlayerApZero: 0.4,
    otherwise: 0.15,
  },
  aiReserveApProbability: 0.85,
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
    argument: 1,
    critical_point: 1,
    evidence: 3,
    strong_evidence: 1,
    additional_experiment: 1,
    revision: 2,
    investigation: 1,
    prior_work: 1,
    cross_check: 1,
  },
  reviewerHp: 5,
  reviewerInitialAp: 3,
  attackWeight: 1.0,
  defenseWeight: 1.5,
  utilityWeight: 1.2,
};

export const REVIEWER2_CONFIG: GameConfig = DEFAULT_CONFIG;
