// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { GameScreen } from './components/GameScreen';

afterEach(cleanup);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('交互冒烟：一局完整对局', () => {
  it('能从玩家回合一路打到结局界面，中途不卡死', async () => {
    render(<GameScreen author="male" onMenu={() => {}} />);
    const speedBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('速度'))!;
    fireEvent.click(speedBtn);
    fireEvent.click(speedBtn);

    let steps = 0;
    for (let i = 0; i < 1500; i++) {
      if (document.querySelector('.gameover')) break;
      const confirm = [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Confirm')) as
        | HTMLButtonElement
        | undefined;
      const accept = [...document.querySelectorAll('button')].find((b) => b.className.includes('accept-btn')) as
        | HTMLButtonElement
        | undefined;
      const endTurn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'End Turn') as
        | HTMLButtonElement
        | undefined;
      const peekOk = [...document.querySelectorAll('button')].find((b) => b.textContent === '知道了');
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
      } else if (handCard) {
        fireEvent.click(handCard);
        steps++;
      } else if (endTurn && !endTurn.disabled) {
        fireEvent.click(endTurn);
        steps++;
      }
      await sleep(60);
    }

    await waitFor(() => expect(document.querySelector('.gameover')).toBeTruthy(), { timeout: 20000 });
    expect(steps).toBeGreaterThan(6);
    const text = document.querySelector('.gameover')!.textContent ?? '';
    expect(text).toMatch(/ACCEPT|REJECT|Play Again/);
  }, 180000);
});
