// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { RouteMap } from './components/RouteMap';
import { GameScreen } from './components/GameScreen';
import { createRunState } from './game/run';
import type { RenderOptions } from './game/run';
import { REVIEWER1_PROFILE } from './game/reviewers';
import { CARD_IDS } from './game/cards';
import { seededRng } from './game/rng';
import { cardText, setLang } from './i18n';

afterEach(() => {
  cleanup();
  setLang('en');
  vi.restoreAllMocks();
});

const RENDER: RenderOptions = {
  playerHp: 5,
  playerMaxHp: 5,
  deck: { argument: 2, evidence: 2 },
  claimPool: ['argument', 'evidence'],
  pendingBattleModifiers: {
    startingApDelta: 0,
    startingHandDelta: 0,
    opponentSuspicionDelta: 0,
    startingCrossCheckCharges: 0,
  },
};

describe('card name effect tooltips', () => {
  it('shows the localized card effect when hovering a claim pool name', () => {
    setLang('zh');
    const run = createRunState('male', 'empirical', seededRng(12));
    const { container } = render(
      <RouteMap run={run} onEnterNode={() => {}} onViewDeck={() => {}} onMenu={() => {}} />,
    );
    const name = container.querySelector('.claim-chip') as HTMLElement;
    const tooltip = name.querySelector('[role="tooltip"]');

    expect(tooltip?.textContent).toContain(cardText('argument', 'zh').description);
    fireEvent.mouseEnter(name);
    expect(name.matches(':hover')).toBe(true);
  });

  it('adds an effect tooltip to the reviewer declared card name', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container } = render(
      <GameScreen
        author="male"
        reviewerProfile={REVIEWER1_PROFILE}
        render={RENDER}
        onBattleEnd={() => {}}
        onMenu={() => {}}
      />,
    );
    const speed = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.startsWith('Speed'),
    ) as HTMLButtonElement;
    fireEvent.click(speed);
    fireEvent.click(speed);
    const endTurn = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'End Turn',
    ) as HTMLButtonElement;
    fireEvent.click(endTurn);

    await waitFor(
      () => {
        const name = container.querySelector('.respond-title .card-name-tooltip');
        expect(name).toBeTruthy();
        const descriptions = CARD_IDS.map((id) => cardText(id).description);
        expect(descriptions).toContain(name?.querySelector('[role="tooltip"] > span')?.textContent);
      },
      { timeout: 15000 },
    );
  }, 30000);
});
