// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GameScreen } from './components/GameScreen';
import { REVIEWER1_PROFILE } from './game/reviewers';
import type { RenderOptions } from './game/run';

afterEach(cleanup);

const RENDER: RenderOptions = {
  playerHp: 5,
  playerMaxHp: 5,
  deck: {
    argument: 2,
    critical_point: 1,
    evidence: 2,
    strong_evidence: 1,
    additional_experiment: 1,
    revision: 2,
    investigation: 1,
    prior_work: 1,
  },
  claimPool: [
    'argument',
    'critical_point',
    'evidence',
    'strong_evidence',
    'additional_experiment',
    'revision',
    'investigation',
    'prior_work',
    'cross_check',
  ],
  pendingBattleModifiers: {
    startingApDelta: 0,
    startingHandDelta: 0,
    opponentSuspicionDelta: 0,
    startingCrossCheckCharges: 0,
  },
};

function renderScreen(onBattleEnd = vi.fn()) {
  render(
    <GameScreen
      author="male"
      reviewerProfile={REVIEWER1_PROFILE}
      render={RENDER}
      onBattleEnd={onBattleEnd}
      onMenu={() => {}}
    />,
  );
  return onBattleEnd;
}

describe('battle UI interaction', () => {
  it('shows the reviewer name and 4 starting cards', async () => {
    renderScreen();
    await waitFor(() => expect(document.querySelectorAll('.hand-card').length).toBe(4));
    expect(document.body.textContent).toContain('Reviewer #1');
    expect(document.body.innerHTML).toContain('End Turn');
  });

  it('declare → confirm → resolution removes the card from hand', async () => {
    renderScreen();
    const hand = await waitFor(() => {
      const cards = document.querySelectorAll('.hand-card');
      expect(cards.length).toBe(4);
      return cards;
    });
    fireEvent.click(hand[0] as HTMLElement);
    await waitFor(() => expect(screen.getByText('Declare this card as...')).toBeTruthy());

    const confirm = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.startsWith('Confirm'),
    ) as HTMLButtonElement;
    fireEvent.click(confirm);

    await waitFor(
      () => {
        expect(document.querySelectorAll('.hand-card').length).toBe(3);
      },
      { timeout: 10000 },
    );
    await waitFor(
      () => {
        expect(document.querySelectorAll('.log-entry.kind-play').length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 15000 },
    );
  }, 40000);

  it('end turn hands control to the reviewer', async () => {
    renderScreen();
    await waitFor(() => expect(document.querySelectorAll('.hand-card').length).toBe(4));
    fireEvent.click(screen.getByText('End Turn'));
    await waitFor(
      () => {
        const turnEntries = document.querySelectorAll('.log-entry.kind-turn');
        expect(turnEntries.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 20000 },
    );
  }, 40000);

  it('declaration modal only lists unlocked claim options', async () => {
    renderScreen();
    await waitFor(() => expect(document.querySelectorAll('.hand-card').length).toBe(4));
    fireEvent.click(document.querySelectorAll('.hand-card')[0] as HTMLElement);
    await waitFor(() => expect(document.querySelectorAll('.declare-opt').length).toBeGreaterThan(0));
    const names = [...document.querySelectorAll('.declare-opt')].map((o) => o.textContent ?? '');
    expect(names.some((n) => n.includes('Prior Work'))).toBe(true);
    expect(names.some((n) => n.includes('Red Herring'))).toBe(false);
  }, 30000);
});
