import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { HowToPlay } from './components/HowToPlay';
import { PaperSubmission } from './components/PaperSubmission';
import { RouteMap } from './components/RouteMap';
import { CardReward } from './components/CardReward';
import { RandomEventScreen } from './components/RandomEvent';
import { RunSummary } from './components/RunSummary';
import { DeckViewer } from './components/DeckViewer';
import { BattleResult } from './components/BattleResult';
import { DeclareModal } from './components/DeclareModal';
import { RANDOM_EVENTS, createRunState, toRenderOptions } from './game/run';
import { seededRng } from './game/rng';
import { DEFAULT_CONFIG } from './game/config';
import { REVIEWER1_PROFILE } from './game/reviewers';
import { createGame, declarePlay, makeContext } from './game/engine';
import type { CardId } from './game/types';

const QUICK_STATS = {
  playerSuccessfulBluffs: 2,
  playerCaughtBluffs: 1,
  playerSuccessfulChallenges: 3,
  playerWrongChallenges: 1,
  reviewerSuccessfulChallenges: 1,
  reviewerWrongChallenges: 3,
  playerCardsPlayed: 9,
  reviewerCardsPlayed: 8,
};

describe('render smoke — V2 screens', () => {
  it('BattleResult overlay reports the outcome and stats', () => {
    const html = renderToString(
      createElement(BattleResult, {
        outcome: 'weak_accept' as const,
        playerHp: 2,
        rounds: 5,
        stats: QUICK_STATS,
        onPlayAgain: () => {},
        onMenu: () => {},
      }),
    );
    expect(html).toContain('WEAK ACCEPT');
    expect(html).toContain('Successful Bluffs');
    expect(html).toContain('Rematch');
  });

  it('App renders without crashing', () => {
    expect(renderToString(createElement(App)).length).toBeGreaterThan(500);
  });

  it('HowToPlay renders', () => {
    const html = renderToString(createElement(HowToPlay, { onBack: () => {}, onStart: () => {} }));
    expect(html.length).toBeGreaterThan(500);
  });

  it('PaperSubmission shows all three paper types', () => {
    const html = renderToString(createElement(PaperSubmission, { onConfirm: () => {}, onBack: () => {} }));
    expect(html).toContain('Theoretical Paper');
    expect(html).toContain('Empirical Paper');
    expect(html).toContain('Method Paper');
    expect(html).toContain('Submit Paper');
  });

  it('RouteMap hides event identity and marks locked nodes', () => {
    const run = createRunState('male', 'empirical', seededRng(12));
    const html = renderToString(
      createElement(RouteMap, { run, onEnterNode: () => {}, onViewDeck: () => {}, onMenu: () => {} }),
    );
    const ev = run.nodes[2].eventId!;
    expect(html).not.toContain(RANDOM_EVENTS[ev].name);
    expect(html).toContain('❓');
    expect(html).toContain('Reviewer #1');
    expect(html).toContain('Reviewer #2');
    expect(html).toContain('Empirical Paper');
    expect(html).toContain('locked');
  });

  it('CardReward shows three cards and the unlock status', () => {
    const run = createRunState('male', 'method', seededRng(3));
    const html = renderToString(
      createElement(CardReward, {
        cards: ['counterargument', 'prior_work', 'burden_of_proof'] as CardId[],
        title: 'Reviewer #1 — ACCEPT',
        subtitle: 'Choose a card',
        currentClaimPool: run.claimPool,
        canSkip: true,
        onSelect: () => {},
        onSkip: () => {},
      }),
    );
    expect(html).toContain('Counterargument');
    expect(html).toContain('Prior Work');
    expect(html).toContain('Burden of Proof');
    expect(html).toContain('Skip Reward');
  });

  it('RandomEvent screen shows both options and their effects', () => {
    const run = createRunState('male', 'theoretical', seededRng(14));
    const html = renderToString(
      createElement(RandomEventScreen, { eventId: 'gpu_available', run, onChoose: () => {} }),
    );
    expect(html).toContain('GPU Available at Midnight');
    expect(html).toContain('Run Everything Overnight');
    expect(html).toContain('Let Someone Else Have It');
  });

  it('RunSummary shows the final outcome', () => {
    const run = { ...createRunState('male', 'theoretical', seededRng(15)), finalResult: 'accept' as const, hp: 3 };
    const html = renderToString(createElement(RunSummary, { run, onPlayAgain: () => {}, onMenu: () => {} }));
    expect(html).toContain('ACCEPT');
    expect(html).toContain('Theoretical Paper');
    expect(html).toContain('Play Again');
    expect(html).toContain('View Final Deck');
  });

  it('DeckViewer lists deck contents and claim pool', () => {
    const run = createRunState('female', 'empirical', seededRng(16));
    const html = renderToString(createElement(DeckViewer, { run, onClose: () => {} }));
    expect(html).toContain('Current Deck');
    expect(html).toContain('Claim Pool');
    expect(html).toContain('Cross-check');
  });

  it('DeclareModal only offers unlocked claims', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(17));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
    const card = s.player.hand[0];
    const html = renderToString(
      createElement(DeclareModal, {
        card,
        player: s.player,
        suspicion: s.suspicion,
        reviewerAp: s.reviewer.ap,
        reviewerHasBurdenOfProof: false,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain('Argument');
    expect(html).toContain('Investigation');
    expect(html).not.toContain('Red Herring');
    expect(html).not.toContain('Burden of Proof');
  });

  it('DeclareModal shows unlocked advanced claims once the pool includes them', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(17));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
    s.player.claimPool = [...s.player.claimPool, 'red_herring'];
    const card = s.player.hand[0];
    const html = renderToString(
      createElement(DeclareModal, {
        card,
        player: s.player,
        suspicion: s.suspicion,
        reviewerAp: s.reviewer.ap,
        reviewerHasBurdenOfProof: false,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain('Red Herring');
    expect(html).toContain('Advanced');
  });

  it('Declaration with an active Burden of Proof is flagged in the modal', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(18));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
    s.player.ap = 5;
    const card = s.player.hand[0];
    const d = declarePlay(s, 'player', card.instanceId, 'evidence', ctx);
    const html = renderToString(
      createElement(DeclareModal, {
        card: d.state.player.hand[0],
        player: d.state.player,
        suspicion: d.state.suspicion,
        reviewerAp: d.state.reviewer.ap,
        reviewerHasBurdenOfProof: true,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain('Burden of Proof');
  });

  it('toRenderOptions feeds the correct deck size into a battle', () => {
    const run = createRunState('male', 'method', seededRng(19));
    const opts = toRenderOptions(run);
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(19));
    const s = createGame(ctx, {
      reviewerProfile: REVIEWER1_PROFILE,
      playerDeck: opts.deck,
      playerClaimPool: opts.claimPool,
    });
    expect(s.player.hand.length + s.player.deck.length + s.player.discard.length).toBe(11);
  });
});
