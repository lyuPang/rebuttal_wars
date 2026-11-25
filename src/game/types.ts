export type Side = 'player' | 'reviewer';

export type Category = 'attack' | 'defense' | 'utility';

export type CardId =
  | 'argument'
  | 'critical_point'
  | 'evidence'
  | 'strong_evidence'
  | 'additional_experiment'
  | 'revision'
  | 'investigation'
  | 'counterargument'
  | 'red_herring'
  | 'prior_work'
  | 'cross_check'
  | 'burden_of_proof';

export type CardEffect =
  | { kind: 'damage'; amount: number; pierce: boolean }
  | { kind: 'damage_conditional'; baseAmount: number; bonusAmount: number; condition: 'opponent_failed_challenge_this_turn' | 'self_bluff_caught' }
  | { kind: 'shield'; amount: number; permanent: boolean }
  | { kind: 'draw'; amount: number }
  | { kind: 'gain_ap'; amount: number }
  | { kind: 'peek'; amount: number }
  | { kind: 'cross_check' }
  | { kind: 'burden_of_proof' };

export interface CardDefinition {
  id: CardId;
  name: string;
  category: Category;
  description: string;
  flavor: string;
  effect: CardEffect;
  artwork: string;
  baseCost: number;
  isAdvanced: boolean;
}

export interface CardInstance {
  instanceId: string;
  cardId: CardId;
}

export type ShieldKind = 'temporary' | 'permanent';

export interface Shield {
  id: string;
  amount: number;
  kind: ShieldKind;
  expires: 'owner_turn_start' | 'never';
}

export type CardUsage = Partial<Record<CardId, number>>;

export interface CharacterState {
  side: Side;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  apDebt: number;
  shields: Shield[];
  hand: CardInstance[];
  deck: CardInstance[];
  discard: CardInstance[];
  cardUsage: CardUsage;
  turnsTaken: number;
  crossCheckCharges: number;
  burdenOfProofActive: boolean;
  failedChallengesThisTurn: number;
  claimPool: CardId[];
}

export type Phase =
  | 'menu'
  | 'player_turn'
  | 'reviewer_turn'
  | 'awaiting_player_challenge'
  | 'awaiting_reviewer_challenge'
  | 'resolving_action'
  | 'game_over';

export type ChallengeStatus = 'pending' | 'accepted' | 'challenge_success' | 'challenge_failed';

export interface PendingPlay {
  id: number;
  actorSide: Side;
  actualCardInstanceId: string;
  actualCardId: CardId;
  declaredCardId: CardId;
  declaredCost: number;
  actualCostSnapshot: number;
  challengeStatus: ChallengeStatus;
  crossCheckRevealedCategory: Category | null;
}

export interface PublicPlayInfo {
  id: number;
  actorSide: Side;
  declaredCardId: CardId;
  declaredCost: number;
  crossCheckRevealedCategory: Category | null;
}

export interface SideDelta {
  hp: number;
  ap: number;
  apDebt: number;
  shield: number;
}

export interface Resolution {
  playId: number;
  actorSide: Side;
  declaredCardId: CardId;
  challenged: boolean;
  outcome: ChallengeStatus;
  revealedCardId: CardId | null;
  executedCardId: CardId;
  extraCost: number;
  usedBurdenOfProof: boolean;
  damage?: { target: Side; absorbed: number; hpLoss: number; pierce: boolean };
  shieldGained?: number;
  permanentShieldGained?: number;
  cardsDrawn?: number;
  apGained?: number;
  apDebtRepaid?: number;
  peekedCardId?: CardId | null;
  crossCheckGranted?: boolean;
  burdenOfProofGranted?: boolean;
  deltas: Record<Side, SideDelta>;
}

export interface HistoryEntry {
  id: number;
  round: number;
  kind: 'play' | 'turn' | 'system';
  actorSide?: Side;
  declaredCardId?: CardId;
  challenged?: boolean;
  challengeCorrect?: boolean;
  revealedCardId?: CardId | null;
  executedCardId?: CardId;
  deltas?: Record<Side, SideDelta>;
  text: string;
}

export type GameOutcome = 'accept' | 'weak_accept' | 'reject';

export interface GameResult {
  outcome: GameOutcome;
  reason: 'hp' | 'deadline';
  winner: Side | null;
}

export interface GameStats {
  playerSuccessfulBluffs: number;
  playerCaughtBluffs: number;
  playerSuccessfulChallenges: number;
  playerWrongChallenges: number;
  reviewerSuccessfulChallenges: number;
  reviewerWrongChallenges: number;
  playerCardsPlayed: number;
  reviewerCardsPlayed: number;
}

export interface ReviewerMemory {
  observedPlayerCards: { instanceId: string; cardId: CardId; round: number }[];
  crossCheckRevealedThisPlay: Category | null;
}

export interface GameState {
  phase: Phase;
  round: number;
  activeSide: Side;
  player: CharacterState;
  reviewer: CharacterState;
  suspicion: number;
  pendingPlay: PendingPlay | null;
  lastResolution: Resolution | null;
  history: HistoryEntry[];
  result: GameResult | null;
  stats: GameStats;
  reviewerMemory: ReviewerMemory;
  nextId: number;
  reviewerName: string;
}
