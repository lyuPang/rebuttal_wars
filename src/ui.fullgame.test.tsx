// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { GameScreen } from './components/GameScreen';
import { REVIEWER1_PROFILE } from './game/reviewers';
import type { RenderOptions } from './game/run';

afterEach(cleanup);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const QUICK: RenderOptions = {
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
    red_herring: 1,
    counterargument: 1,
  },
  claimPool: [
    'argument',
    'critical_point',
    'evidence',
    'strong_evidence',
    'additional_experiment',
    'revision',
    'investigation',
    'red_herring',
    'counterargument',
  ],
  pendingBattleModifiers: {
    startingApDelta: 0,
    startingHandDelta: 0,
    opponentSuspicionDelta: 0,
    startingCrossCheckCharges: 0,
  },
};

describe('interaction smoke — a full battle', () => {
  it('plays through to onBattleEnd without deadlocking', async () => {
    const onBattleEnd = vi.fn();
    render(
      <GameScreen
        author="male"
        reviewerProfile={REVIEWER1_PROFILE}
        render={QUICK}
        onBattleEnd={onBattleEnd}
        onMenu={() => {}}
      />,
    );

    const speedBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.startsWith('Speed'),
    ) as HTMLButtonElement;
    fireEvent.click(speedBtn);
    fireEvent.click(speedBtn);

    let steps = 0;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline && !onBattleEnd.mock.calls.length) {
      const buttons = [...document.querySelectorAll('button')] as HTMLButtonElement[];
      const confirm = buttons.find((b) => b.textContent?.startsWith('Confirm'));
      const accept = buttons.find((b) => b.className.includes('accept-btn'));
      const challenge = buttons.find((b) => b.className.includes('challenge-btn'));
      const endTurn = buttons.find((b) => b.textContent === 'End Turn');
      const peekOk = buttons.find((b) => b.textContent === 'Got it');
      const handCard = [...document.querySelectorAll('.hand-card')].find(
        (c) => !c.className.includes('disabled'),
      ) as HTMLButtonElement | undefined;

      if (peekOk) {
        fireEvent.click(peekOk);
        steps++;
      } else if (confirm) {
        fireEvent.click(confirm);
        steps++;
      } else if (accept) {
        fireEvent.click(accept);
        steps++;
      } else if (challenge && !challenge.disabled && Math.random() < 0.4) {
        fireEvent.click(challenge);
        steps++;
      } else if (handCard) {
        fireEvent.click(handCard);
        steps++;
      } else if (endTurn && !endTurn.disabled) {
        fireEvent.click(endTurn);
        steps++;
      }
      await sleep(30);
    }

    await waitFor(() => expect(onBattleEnd.mock.calls.length).toBeGreaterThan(0), { timeout: 20000 });
    expect(steps).toBeGreaterThan(5);
    const result = onBattleEnd.mock.calls[0][0] as { outcome: string; playerHp: number };
    expect(['accept', 'weak_accept', 'reject']).toContain(result.outcome);
    expect(result.playerHp).toBeGreaterThanOrEqual(0);
  }, 180000);
});
