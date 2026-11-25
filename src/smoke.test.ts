import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { GameScreen } from './components/GameScreen';
import { DeclareModal } from './components/DeclareModal';
import { HowToPlay } from './components/HowToPlay';
import { GameOver } from './components/GameOver';
import { createGame, makeContext, declarePlay, respondToPlay } from './game/engine';
import { seededRng } from './game/rng';
import { DEFAULT_CONFIG } from './game/config';
import type { CardId, GameState } from './game/types';

function midGame(): GameState {
  const ctx = makeContext(DEFAULT_CONFIG, seededRng(7));
  let s = createGame(ctx);
  const card = s.player.hand.find((h) => h.cardId === 'evidence') ?? s.player.hand[0];
  const declared: CardId = 'critical_point';
  const d = declarePlay(s, 'player', card.instanceId, declared, ctx);
  s = respondToPlay(d.state, true, ctx).state;
  return s;
}

describe('render smoke', () => {
  it('各界面可渲染', () => {
    expect(renderToString(createElement(App)).length).toBeGreaterThan(1000);
    expect(renderToString(createElement(HowToPlay, { onBack: () => {}, onStart: () => {} })).length).toBeGreaterThan(
      1000,
    );
    const html = renderToString(createElement(GameScreen, { author: 'female', onMenu: () => {} }));
    expect(html).toContain('End Turn');
    expect(html).toContain('Reviewer #2');
  });

  it('宣称弹窗与结局界面可渲染', () => {
    const g = midGame();
    const card = g.player.hand[0];
    const html = renderToString(
      createElement(DeclareModal, {
        card,
        player: g.player,
        suspicion: g.suspicion,
        reviewerAp: g.reviewer.ap,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain('虚张声势');
    const over = { ...g, result: { outcome: 'accept' as const, reason: 'hp' as const, winner: 'player' as const } };
    const html2 = renderToString(createElement(GameOver, { game: over, onPlayAgain: () => {}, onMenu: () => {} }));
    expect(html2).toContain('ACCEPT');
  });
});
