// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { StartScreen } from './components/StartScreen';
import { PaperSubmission } from './components/PaperSubmission';
import { RouteMap } from './components/RouteMap';
import { RunSummary } from './components/RunSummary';
import { HowToPlay } from './components/HowToPlay';
import { RandomEventScreen } from './components/RandomEvent';
import { GameScreen } from './components/GameScreen';
import { CARD_IDS } from './game/cards';
import { DEFAULT_CONFIG } from './game/config';
import { createGame, declarePlay, endTurn, makeContext, respondToPlay } from './game/engine';
import { ALL_EVENT_IDS, PAPER_TYPES, RANDOM_EVENTS, createRunState, toRenderOptions } from './game/run';
import { REVIEWER1_PROFILE, REVIEWER2_PROFILE } from './game/reviewers';
import { seededRng } from './game/rng';
import { cardText, eventText, getLang, paperText, reviewerLines, setLang, uiText } from './i18n';
import { UI } from './i18n/ui';

const memory = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  },
});

afterEach(() => {
  cleanup();
  setLang('en');
});

describe('i18n — translation coverage', () => {
  it('every card, paper type and event has a distinct Chinese translation', () => {
    for (const id of CARD_IDS) {
      const zh = cardText(id, 'zh');
      expect(zh.name).not.toBe(cardText(id, 'en').name);
      expect(zh.description).toMatch(/[\u4e00-\u9fa5]/);
      expect(zh.flavor).toMatch(/[\u4e00-\u9fa5]/);
    }
    for (const id of Object.keys(PAPER_TYPES) as (keyof typeof PAPER_TYPES)[]) {
      expect(paperText(id, 'zh').name).toMatch(/[\u4e00-\u9fa5]/);
    }
    for (const id of ALL_EVENT_IDS) {
      const zh = eventText(id, 'zh');
      expect(zh.name).toMatch(/[\u4e00-\u9fa5]/);
      expect(zh.options).toHaveLength(RANDOM_EVENTS[id].options.length);
      zh.options.forEach((o) => expect(o.label).toMatch(/[\u4e00-\u9fa5]/));
    }
  });

  it('every reviewer line has a Chinese counterpart', () => {
    for (const profile of [REVIEWER1_PROFILE, REVIEWER2_PROFILE]) {
      for (const cardId of Object.keys(profile.lines) as (typeof CARD_IDS)[number][]) {
        const zh = reviewerLines(profile, cardId, 'zh');
        expect(zh.length).toBe(profile.lines[cardId].length);
        zh.forEach((l) => expect(l).toMatch(/[\u4e00-\u9fa5]/));
      }
    }
  });

  it('the Chinese UI dictionary defines every English key', () => {
    expect(Object.keys(UI.zh).sort()).toEqual(Object.keys(UI.en).sort());
  });
});

describe('i18n — language switching', () => {
  it('start screen offers English / 中文 and persists the choice', () => {
    render(
      createElement(StartScreen, {
        author: 'male',
        onAuthor: () => {},
        onStart: () => {},
        onQuick: () => {},
        onHowTo: () => {},
        sfx: true,
        music: true,
        onToggleSfx: () => {},
        onToggleMusic: () => {},
      }),
    );
    expect(screen.getByText('Conference Run')).toBeTruthy();
    fireEvent.click(screen.getByText('中文'));
    expect(getLang()).toBe('zh');
    expect(window.localStorage.getItem('rebuttal_wars.lang')).toBe('zh');
    expect(screen.getByText('会议投稿之旅')).toBeTruthy();
    expect(screen.getByText('快速 Rebuttal')).toBeTruthy();
    expect(document.documentElement.lang).toBe('zh-CN');
    fireEvent.click(screen.getByText('English'));
    expect(screen.getByText('Conference Run')).toBeTruthy();
  });

  it('engine battle log is written in the active language', () => {
    setLang('zh');
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(5));
    let s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
    const card = s.player.hand[0];
    const d = declarePlay(s, 'player', card.instanceId, card.cardId, ctx);
    s = respondToPlay(d.state, true, ctx).state;
    s = endTurn(s, 'player', ctx).state;
    const log = s.history.map((h) => h.text).join('\n');
    expect(log).toContain('论文已提交');
    expect(log).toContain('审稿人 #1');
    expect(log).toContain(`宣称「${cardText(card.cardId, 'zh').name}」`);
    expect(log).toContain('冤枉好人');
    expect(log).toContain('结束回合');
    expect(log).not.toMatch(/declares|Round \d/);
  });

  it('English stays the default log language', () => {
    const ctx = makeContext(DEFAULT_CONFIG, seededRng(5));
    const s = createGame(ctx, { reviewerProfile: REVIEWER1_PROFILE });
    expect(s.history[0].text).toContain('Paper submitted');
  });
});

describe('i18n — Chinese screens', () => {
  it('run screens render Chinese text', () => {
    setLang('zh');
    const run = createRunState('male', 'empirical', seededRng(12));
    const paper = renderToString(createElement(PaperSubmission, { onConfirm: () => {}, onBack: () => {} }));
    expect(paper).toContain('提交你的论文');
    expect(paper).toContain('理论论文');
    expect(paper).not.toContain('Submit Paper');

    const map = renderToString(createElement(RouteMap, { run, onEnterNode: () => {}, onViewDeck: () => {}, onMenu: () => {} }));
    expect(map).toContain('审稿路线');
    expect(map).toContain('审稿人 #2');
    expect(map).toContain('交叉验证');

    const ev = renderToString(createElement(RandomEventScreen, { eventId: 'gpu_available', run, onChoose: () => {} }));
    expect(ev).toContain('午夜 GPU 空闲');

    const summary = renderToString(
      createElement(RunSummary, { run: { ...run, finalResult: 'accept' as const }, onPlayAgain: () => {}, onMenu: () => {} }),
    );
    expect(summary).toContain('论文被接收');
    expect(summary).toContain('再来一局');

    const howto = renderToString(createElement(HowToPlay, { onBack: () => {}, onStart: () => {} }));
    expect(howto).toContain('游戏说明');
    expect(howto).not.toContain('How to Play');
  });

  it('battle screen renders Chinese controls and reviewer name', () => {
    setLang('zh');
    const run = createRunState('male', 'method', seededRng(3));
    render(
      createElement(GameScreen, {
        author: 'male',
        reviewerProfile: REVIEWER1_PROFILE,
        render: toRenderOptions(run),
        onBattleEnd: () => {},
        onMenu: () => {},
      }),
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain(uiText('zh').endTurn);
    expect(text).toContain('审稿人 #1');
    expect(text).toContain('警惕值');
    expect(text).not.toContain('End Turn');
  });
});
