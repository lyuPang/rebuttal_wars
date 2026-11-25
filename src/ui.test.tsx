// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach } from 'vitest';
import { GameScreen } from './components/GameScreen';

afterEach(cleanup);

describe('交互冒烟：完整一次出牌流程', () => {
  it('选牌 → 宣称 → 结算 → 手牌减少', async () => {
    render(<GameScreen author="male" onMenu={() => {}} />);
    const handCards = await waitFor(() => {
      const cards = document.querySelectorAll('.hand-card');
      expect(cards.length).toBe(4);
      return cards;
    });
    const before = handCards.length;
    fireEvent.click(handCards[0] as HTMLElement);
    await waitFor(() => expect(screen.getByText('宣称这张牌是……')).toBeTruthy());
    fireEvent.click(screen.getByText(/^Confirm/));
    await waitFor(
      () => {
        expect(document.querySelectorAll('.hand-card').length).toBe(before - 1);
      },
      { timeout: 8000 },
    );
    await waitFor(
      () => {
        expect(document.querySelectorAll('.log-entry.kind-play').length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 10000 },
    );
    const log = document.querySelector('.log-entry.kind-play')!.textContent ?? '';
    expect(log).toMatch(/宣称/);
    expect(document.querySelector('.turn-hint')!.textContent).toBeTruthy();
  }, 30000);

  it('结束回合后 Reviewer 会自动行动且玩家可响应', async () => {
    render(<GameScreen author="female" onMenu={() => {}} />);
    await waitFor(() => expect(document.querySelectorAll('.hand-card').length).toBe(4));
    fireEvent.click(screen.getByText('End Turn'));
    await waitFor(
      () => {
        const hasRespond = document.querySelector('.respond-panel');
        const reviewerPhase = document.querySelector('.log-entry.kind-turn.actor-reviewer');
        expect(hasRespond || reviewerPhase).toBeTruthy();
      },
      { timeout: 20000 },
    );
  }, 40000);
});
