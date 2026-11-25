import type { CardId } from './types';
import { BASIC_CARD_IDS } from './cards';
import { DEFAULT_CONFIG, REVIEWER1_CONFIG, type GameConfig } from './config';

export interface ReviewerConfig {
  id: 'reviewer1' | 'reviewer2';
  name: string;
  gameConfig: GameConfig;
  claimPool: CardId[];
  imageKey: string;
  lines: Record<string, string[]>;
  thinkLines: string[];
}

export const REVIEWER1_PROFILE: ReviewerConfig = {
  id: 'reviewer1',
  name: 'Reviewer #1',
  gameConfig: REVIEWER1_CONFIG,
  claimPool: [...BASIC_CARD_IDS, 'prior_work', 'cross_check'] as CardId[],
  imageKey: 'reviewer1',
  lines: {
    argument: [
      'Could you provide a more rigorous justification?',
      'The baselines need to be updated.',
    ],
    critical_point: [
      'This claim requires stronger evidence.',
      'I am not convinced by the theoretical analysis.',
    ],
    evidence: [
      'As I stated in my review...',
      'Please clarify the assumptions in your formulation.',
    ],
    strong_evidence: [
      'I am an expert in this area.',
      'The authors should provide a more detailed explanation.',
    ],
    additional_experiment: [
      'I need more ablations.',
      'Let me re-read the appendix.',
    ],
    revision: [
      'I have updated my review.',
      'Let me reconsider...',
    ],
    investigation: [
      'Let me check your code.',
      'Where is the GitHub link?',
    ],
    prior_work: [
      'See my 2009 paper.',
      'Prior work already did this.',
    ],
    cross_check: [
      'I will verify this claim carefully.',
      'The evidence does not add up.',
    ],
  },
  thinkLines: ['Hmm...', 'Suspicious...', 'Let me think.', 'Really?'],
};

export const REVIEWER2_PROFILE: ReviewerConfig = {
  id: 'reviewer2',
  name: 'Reviewer #2',
  gameConfig: DEFAULT_CONFIG,
  claimPool: [...BASIC_CARD_IDS, 'red_herring', 'counterargument'] as CardId[],
  imageKey: 'reviewer',
  lines: {
    argument: ['The baselines are clearly outdated.', 'Section 3 is confusing.'],
    critical_point: ['This is a fatal flaw.', 'The main claim is NOT supported.'],
    evidence: ['As I stated in my review...', 'Prior work already did this.'],
    strong_evidence: ['I am an expert in this area.', 'See my 2009 paper.'],
    additional_experiment: ['I need more ablations.', 'Let me re-read the appendix.'],
    revision: ['I have updated my review.', 'Let me reconsider... no.'],
    investigation: ['Let me check your code.', 'Where is the GitHub link?'],
    red_herring: ['The novelty is clearly limited.', 'This is a fatal flaw.'],
    counterargument: ['The authors have not addressed my concerns.', 'I strongly recommend rejection.'],
  },
  thinkLines: ['Hmm...', 'Suspicious...', 'Let me think.', 'Really?'],
};
