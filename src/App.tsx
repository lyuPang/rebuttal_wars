import { useCallback, useEffect, useRef, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { HowToPlay } from './components/HowToPlay';
import { GameScreen } from './components/GameScreen';
import { PaperSubmission } from './components/PaperSubmission';
import { RouteMap } from './components/RouteMap';
import { CardReward } from './components/CardReward';
import { RandomEventScreen } from './components/RandomEvent';
import { RunSummary } from './components/RunSummary';
import { DeckViewer } from './components/DeckViewer';
import { BattleResult } from './components/BattleResult';
import { audio, type SceneKey } from './audio';
import { ASSETS, type AuthorKind } from './assets';
import { preloadTransparent } from './hooks/useTransparentImage';
import { REVIEWER1_PROFILE, REVIEWER2_PROFILE } from './game/reviewers';
import {
  RANDOM_EVENTS,
  addCardToRun,
  advanceNode,
  applyEventEffect,
  completeNode,
  createRunState,
  finishRewardStep,
  pickThreeRewardCards,
  resolveBattleEnd,
  toRenderOptions,
  type EventId,
  type PaperTypeId,
  type RenderOptions,
  type RunState,
} from './game/run';
import { defaultRng } from './game/rng';
import type { CardId, GameOutcome, GameStats } from './game/types';

type Screen = 'menu' | 'howto' | 'paper_submission' | 'route_map' | 'battle' | 'card_reward' | 'random_event' | 'run_summary';

const rng = defaultRng;

const QUICK_RENDER: RenderOptions = {
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

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [author, setAuthor] = useState<AuthorKind>('male');
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(true);

  const [run, setRun] = useState<RunState | null>(null);
  const [quick, setQuick] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
  const [rewardCards, setRewardCards] = useState<[CardId, CardId, CardId] | null>(null);
  const [activeEventId, setActiveEventId] = useState<EventId | null>(null);
  const [pendingChoose, setPendingChoose] = useState<[CardId, CardId, CardId] | null>(null);
  const [lastBattleInfo, setLastBattleInfo] = useState<{ outcome: GameOutcome; healed: number } | null>(null);
  const [showDeck, setShowDeck] = useState(false);
  const [quickResult, setQuickResult] = useState<{
    outcome: GameOutcome;
    playerHp: number;
    rounds: number;
    stats: GameStats;
  } | null>(null);
  const runRef = useRef<RunState | null>(null);

  useEffect(() => {
    preloadTransparent([ASSETS.authorMale, ASSETS.authorFemale, ASSETS.reviewer]);
  }, []);

  const updateRun = (r: RunState | null) => {
    runRef.current = r;
    setRun(r);
  };

  const goto = (s: Screen) => setScreen(s);

  const cleanupAudio = () => {
    audio.stopAll(0.4);
    audio.resetSession();
  };

  const resetAll = () => {
    cleanupAudio();
    updateRun(null);
    setQuick(false);
    setRewardCards(null);
    setActiveEventId(null);
    setPendingChoose(null);
    setLastBattleInfo(null);
    setShowDeck(false);
    setQuickResult(null);
  };

  const goMenu = () => {
    audio.play('click');
    resetAll();
    goto('menu');
  };

  const startConferenceRun = () => {
    audio.play('click');
    audio.unlock();
    resetAll();
    goto('paper_submission');
  };

  const startQuickRebuttal = () => {
    audio.play('click');
    audio.unlock();
    resetAll();
    setQuick(true);
    setBattleKey((k) => k + 1);
    goto('battle');
  };

  const confirmPaperType = (paperTypeId: PaperTypeId) => {
    audio.play('click');
    updateRun(createRunState(author, paperTypeId, rng));
    goto('route_map');
  };

  const enterNode = (index: number) => {
    const r = runRef.current;
    if (!r) return;
    const node = r.nodes[index];
    if (!node || node.status !== 'available') return;
    audio.play('click');

    if (node.type === 'battle1' || node.type === 'battle2') {
      setBattleKey((k) => k + 1);
      goto('battle');
      return;
    }
    if (node.type === 'event' && node.eventId) {
      setActiveEventId(node.eventId);
      goto('random_event');
      return;
    }
    if (node.type === 'final_decision') {
      goto('run_summary');
    }
  };

  const handleBattleEnd = useCallback(
    (result: { outcome: GameOutcome; playerHp: number; rounds: number; stats: GameStats }) => {
      const r = runRef.current;
      if (!r) return;

      const resolved = resolveBattleEnd(r, result);
      updateRun(resolved.run);

      if (resolved.screen === 'summary') {
        goto('run_summary');
        return;
      }

      setLastBattleInfo({
        outcome: result.outcome,
        healed: resolved.run.hp - Math.max(0, result.playerHp),
      });
      setRewardCards(pickThreeRewardCards(rng));
      goto('card_reward');
    },
    [],
  );

  const handleQuickBattleEnd = useCallback(
    (result: { outcome: GameOutcome; playerHp: number; rounds: number; stats: GameStats }) => {
      setQuickResult(result);
    },
    [],
  );

  const advanceAfterNode = (state: RunState, nodeIndex: number): RunState => {
    return advanceNode(completeNode(state, nodeIndex));
  };

  const chooseReward = (cardId: CardId) => {
    const r = runRef.current;
    if (!r) return;
    audio.play('click');
    updateRun(finishRewardStep(r, cardId));
    setRewardCards(null);
    goto('route_map');
  };

  const skipReward = () => {
    const r = runRef.current;
    if (!r) return;
    audio.play('click');
    updateRun(finishRewardStep(r, null));
    setRewardCards(null);
    goto('route_map');
  };

  const chooseEventOption = (optionIndex: 0 | 1) => {
    const r = runRef.current;
    if (!r || !activeEventId) return;
    const ev = RANDOM_EVENTS[activeEventId];
    const option = ev.options[optionIndex];
    if (!option) return;
    if (option.disabledWhen && option.disabledWhen(r)) return;
    audio.play('click');

    const applied = applyEventEffect(r, option.effect, rng);
    let next: RunState = {
      ...applied.run,
      encounteredEventIds: [...applied.run.encounteredEventIds, activeEventId],
      eventHistory: [...applied.run.eventHistory, { eventId: activeEventId, chosenOption: optionIndex }],
    };

    if (applied.pendingChoose) {
      updateRun(next);
      setPendingChoose(pickThreeRewardCards(rng));
      return;
    }

    next = advanceAfterNode(next, r.currentNodeIndex);
    updateRun(next);
    setActiveEventId(null);
    goto('route_map');
  };

  const resolvePendingChoose = (cardId: CardId) => {
    const r = runRef.current;
    if (!r) return;
    audio.play('click');
    let next = addCardToRun(r, cardId);
    next = { ...next, rewardHistory: [...next.rewardHistory, { nodeIndex: r.currentNodeIndex, cardId }] };
    next = advanceAfterNode(next, r.currentNodeIndex);
    updateRun(next);
    setPendingChoose(null);
    setActiveEventId(null);
    goto('route_map');
  };

  const playAgain = () => {
    audio.play('click');
    resetAll();
    goto('paper_submission');
  };

  const toggleSfx = () => {
    const v = !sfx;
    audio.setSfx(v);
    setSfx(v);
    audio.play('click');
  };

  const toggleMusic = () => {
    const v = !music;
    audio.setMusic(v);
    setMusic(v);
  };

  const sceneForScreen = (): SceneKey => {
    switch (screen) {
      case 'menu':
      case 'howto':
      case 'paper_submission':
        return 'menu';
      case 'route_map':
        return 'route_map';
      case 'card_reward':
        return 'card_reward';
      case 'random_event':
        return 'random_event';
      case 'battle':
        if (quick) return 'battle2';
        return run?.currentNodeIndex === 4 ? 'battle2' : 'battle1';
      case 'run_summary': {
        const o = run?.finalResult ?? 'reject';
        return o === 'accept' ? 'run_summary_accept' : o === 'weak_accept' ? 'run_summary_weak_accept' : 'run_summary_reject';
      }
      default:
        return 'menu';
    }
  };

  useEffect(() => {
    audio.setScene(sceneForScreen());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, run?.currentNodeIndex, run?.finalResult, quick, music]);

  let reviewerProfile = run?.currentNodeIndex === 4 ? REVIEWER2_PROFILE : REVIEWER1_PROFILE;
  if (quick) reviewerProfile = REVIEWER2_PROFILE;

  const renderOptions = run ? toRenderOptions(run) : QUICK_RENDER;

  return (
    <div className="app">
      {screen === 'menu' && (
        <StartScreen
          author={author}
          onAuthor={setAuthor}
          onStart={startConferenceRun}
          onQuick={startQuickRebuttal}
          onHowTo={() => {
            audio.play('click');
            goto('howto');
          }}
          sfx={sfx}
          music={music}
          onToggleSfx={toggleSfx}
          onToggleMusic={toggleMusic}
        />
      )}

      {screen === 'howto' && (
        <HowToPlay
          onBack={() => {
            audio.play('click');
            goto('menu');
          }}
          onStart={startConferenceRun}
        />
      )}

      {screen === 'paper_submission' && (
        <PaperSubmission
          onConfirm={confirmPaperType}
          onBack={() => {
            audio.play('click');
            goto('menu');
          }}
        />
      )}

      {screen === 'route_map' && run && (
        <RouteMap run={run} onEnterNode={enterNode} onViewDeck={() => setShowDeck(true)} onMenu={goMenu} />
      )}

      {screen === 'battle' && (
        <GameScreen
          key={battleKey}
          author={author}
          reviewerProfile={reviewerProfile}
          render={renderOptions}
          onBattleEnd={quick ? handleQuickBattleEnd : handleBattleEnd}
          onMenu={goMenu}
        />
      )}

      {screen === 'card_reward' && run && rewardCards && (
        <CardReward
          cards={[...rewardCards]}
          title={lastBattleInfo?.outcome === 'accept' ? 'Reviewer #1 — ACCEPT' : 'Reviewer #1 — WEAK ACCEPT'}
          subtitle={`You recovered ${lastBattleInfo?.healed ?? 0} HP. Choose one card to add to your deck.`}
          currentClaimPool={run.claimPool}
          canSkip
          onSelect={chooseReward}
          onSkip={skipReward}
        />
      )}

      {screen === 'random_event' && run && activeEventId && (
        <RandomEventScreen eventId={activeEventId} run={run} onChoose={chooseEventOption} />
      )}

      {screen === 'run_summary' && run && <RunSummary run={run} onPlayAgain={playAgain} onMenu={goMenu} />}

      {pendingChoose && run && (
        <div className="modal-backdrop">
          <CardReward
            cards={[...pendingChoose]}
            title="Choose an Advanced Card"
            subtitle="The cost is already paid. Pick one card — skipping is not allowed."
            currentClaimPool={run.claimPool}
            canSkip={false}
            onSelect={resolvePendingChoose}
          />
        </div>
      )}

      {showDeck && run && <DeckViewer run={run} onClose={() => setShowDeck(false)} />}

      {quick && quickResult && (
        <BattleResult
          outcome={quickResult.outcome}
          playerHp={quickResult.playerHp}
          rounds={quickResult.rounds}
          stats={quickResult.stats}
          title={`REVIEWER #2 — ${quickResult.outcome === 'reject' ? 'REJECT' : 'ACCEPT'}`}
          onPlayAgain={() => {
            setQuickResult(null);
            setBattleKey((k) => k + 1);
          }}
          onMenu={goMenu}
        />
      )}

      <div className="global-toggles">
        <button className={`btn tiny ${sfx ? '' : 'ghost'}`} onClick={toggleSfx} title="Toggle sound effects">
          SFX {sfx ? 'ON' : 'OFF'}
        </button>
        <button className={`btn tiny ${music ? '' : 'ghost'}`} onClick={toggleMusic} title="Toggle background music">
          BGM {music ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
