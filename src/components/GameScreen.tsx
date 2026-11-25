import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CARDS } from '../game/cards';
import {
  canChallenge,
  canPlayAnything,
  createGame,
  declarePlay,
  endTurn,
  getCost,
  makeContext,
  opponentOf,
  respondToPlay,
  totalShield,
} from '../game/engine';
import { buildChallengeView, buildReviewerView, decideReviewerAction, decideReviewerChallenge } from '../game/ai';
import type { CardId, CardInstance, GameState, Resolution, Side } from '../game/types';
import { audio } from '../audio';
import { ASSETS, authorImage, type AuthorKind } from '../assets';
import { Character, type CharStatus, type FloatText } from './Character';
import { StatusBar } from './StatusBar';
import { DeclareModal } from './DeclareModal';
import { ActionLog } from './ActionLog';
import { GameOver } from './GameOver';
import { CardBack, CardFace } from './Card';

interface StageCard {
  key: number;
  actorSide: Side;
  declaredCardId: CardId;
  ownActualCardId: CardId | null;
  revealedCardId: CardId | null;
  flipped: boolean;
  verdict: 'pending' | 'accepted' | 'caught' | 'false';
}

interface Banner {
  text: string;
  kind: 'caught' | 'false' | 'accepted' | 'info';
}

const REVIEWER_LINES: Record<CardId, string[]> = {
  argument: ['The baselines are clearly outdated.', 'Section 3 is confusing.'],
  critical_point: ['This is a fatal flaw.', 'The main claim is NOT supported.'],
  evidence: ['As I stated in my review...', 'Prior work already did this.'],
  strong_evidence: ['I am an expert in this area.', 'See my 2009 paper.'],
  additional_experiment: ['I need more ablations.', 'Let me re-read the appendix.'],
  revision: ['I have updated my review.', 'Let me reconsider... no.'],
  investigation: ['Let me check your code.', 'Where is the GitHub link?'],
};

const THINK_LINES = ['Hmm...', 'Suspicious...', 'Let me think.', 'Really?'];

interface Props {
  author: AuthorKind;
  onMenu: () => void;
}

export function GameScreen({ author, onMenu }: Props) {
  const ctx = useMemo(() => makeContext(), []);
  const [game, setGame] = useState<GameState>(() => createGame(ctx));
  const gameRef = useRef(game);
  const [busy, setBusyState] = useState(false);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<CardInstance | null>(null);
  const [stage, setStage] = useState<StageCard | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [turnBanner, setTurnBanner] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<Side, CharStatus>>({ player: 'idle', reviewer: 'idle' });
  const [speech, setSpeech] = useState<Record<Side, string | null>>({ player: null, reviewer: null });
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [peek, setPeek] = useState<{ cardId: CardId | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const floatId = useRef(1);
  const stageKey = useRef(1);

  const authorImg = authorImage(author);

  const commit = useCallback((s: GameState) => {
    gameRef.current = s;
    setGame(s);
  }, []);

  const setBusy = (v: boolean) => {
    busyRef.current = v;
    setBusyState(v);
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, ms / speedRef.current));

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const showTurnBanner = useCallback(async (side: Side) => {
    setTurnBanner(side === 'player' ? 'YOUR TURN' : "REVIEWER #2'S TURN");
    audio.play('turn');
    await wait(900);
    if (aliveRef.current) setTurnBanner(null);
  }, []);

  useEffect(() => {
    void showTurnBanner('player');
  }, [showTurnBanner]);

  const addFloats = (res: Resolution) => {
    const items: FloatText[] = [];
    (['player', 'reviewer'] as Side[]).forEach((side) => {
      const d = res.deltas[side];
      const mk = (text: string, kind: FloatText['kind'], positive: boolean) =>
        items.push({ id: floatId.current++, side, text, kind, positive });
      if (d.hp) mk(`${d.hp > 0 ? '+' : ''}${d.hp} HP`, 'hp', d.hp > 0);
      if (d.shield) mk(`${d.shield > 0 ? '+' : ''}${d.shield} 护盾`, 'shield', d.shield > 0);
      if (d.ap) mk(`${d.ap > 0 ? '+' : ''}${d.ap} AP`, 'ap', d.ap > 0);
      if (d.apDebt) mk(`欠额 ${d.apDebt > 0 ? '+' : ''}${d.apDebt}`, 'debt', d.apDebt < 0);
    });
    if (res.cardsDrawn) {
      items.push({
        id: floatId.current++,
        side: res.actorSide,
        text: `抽 ${res.cardsDrawn} 张`,
        kind: 'info',
        positive: true,
      });
    }
    if (!items.length) return;
    setFloats((f) => [...f, ...items]);
    const ids = new Set(items.map((i) => i.id));
    window.setTimeout(() => {
      if (aliveRef.current) setFloats((f) => f.filter((x) => !ids.has(x.id)));
    }, 1700);
  };

  const showFloat = (side: Side, text: string, kind: FloatText['kind'], positive: boolean) => {
    const item = { id: floatId.current++, side, text, kind, positive };
    setFloats((f) => [...f, item]);
    window.setTimeout(() => {
      if (aliveRef.current) setFloats((f) => f.filter((x) => x.id !== item.id));
    }, 1700);
  };

  const animateResolution = async (res: Resolution) => {
    const challenger = opponentOf(res.actorSide);
    if (res.challenged) {
      const caught = res.outcome === 'challenge_success';
      setStage((st) => (st ? { ...st, revealedCardId: res.revealedCardId, flipped: true, verdict: caught ? 'caught' : 'false' } : st));
      setBanner({ text: caught ? 'BLUFF CAUGHT!' : 'FALSE ACCUSATION!', kind: caught ? 'caught' : 'false' });
      setStatus({
        [challenger]: caught ? 'challenge_success' : 'challenge_fail',
        [res.actorSide]: caught ? 'challenge_fail' : 'challenge_success',
      } as Record<Side, CharStatus>);
      audio.play(caught ? 'challenge_success' : 'challenge_fail');
      await wait(1300);
    } else {
      setStage((st) => (st ? { ...st, verdict: 'accepted' } : st));
      setBanner({ text: 'CLAIM ACCEPTED!', kind: 'accepted' });
      audio.play('accept');
      await wait(750);
    }
    if (!aliveRef.current) return;
    const eff = CARDS[res.executedCardId].effect;
    const next: Record<Side, CharStatus> = { player: 'idle', reviewer: 'idle' };
    if (eff.kind === 'damage' && res.damage) {
      next[res.actorSide] = 'attack';
      next[res.damage.target] = res.damage.hpLoss > 0 ? 'damage' : 'block';
      audio.play(res.damage.hpLoss > 0 ? 'hit' : 'block');
      if (res.damage.absorbed > 0) showFloat(res.damage.target, `护盾抵挡 ${res.damage.absorbed}`, 'shield', true);
      if (res.damage.pierce && res.damage.hpLoss > 0) showFloat(res.damage.target, '穿透！', 'info', false);
    } else if (eff.kind === 'shield') {
      next[res.actorSide] = 'defense';
      audio.play('shield');
    } else if (eff.kind === 'draw') {
      audio.play('draw');
    } else if (eff.kind === 'gain_ap') {
      audio.play('accept');
    } else if (eff.kind === 'peek') {
      audio.play('peek');
    }
    setStatus(next);
    addFloats(res);
    await wait(950);
    if (!aliveRef.current) return;
    setStage(null);
    setBanner(null);
    setStatus({ player: 'idle', reviewer: 'idle' });
    setSpeech({ player: null, reviewer: null });

    if (res.actorSide === 'player' && eff.kind === 'peek') {
      setPeek({ cardId: res.peekedCardId ?? null });
    }
    if (res.actorSide === 'reviewer' && eff.kind === 'peek') {
      setToast(res.peekedCardId === undefined || res.peekedCardId === null ? 'Reviewer 想偷看你的手牌，但你没有手牌。' : 'Reviewer #2 偷看了你的一张手牌……');
      window.setTimeout(() => aliveRef.current && setToast(null), 2200);
    }
  };

  const handleGameOverIfNeeded = async () => {
    const s = gameRef.current;
    if (s.phase !== 'game_over' || !s.result) return false;
    await wait(500);
    audio.play(s.result.outcome === 'reject' ? 'lose' : 'win');
    setShowGameOver(true);
    return true;
  };

  const playerDeclare = async (instanceId: string, declared: CardId) => {
    if (busyRef.current) return;
    const card = gameRef.current.player.hand.find((h) => h.instanceId === instanceId);
    const r = declarePlay(gameRef.current, 'player', instanceId, declared, ctx);
    setSelected(null);
    if (!r.ok || !card) return;
    setBusy(true);
    commit(r.state);
    audio.play('play');
    showFloat('player', `-${r.state.pendingPlay!.declaredCost} AP`, 'ap', false);
    setStage({
      key: stageKey.current++,
      actorSide: 'player',
      declaredCardId: declared,
      ownActualCardId: card.cardId,
      revealedCardId: null,
      flipped: false,
      verdict: 'pending',
    });
    setSpeech({ player: CARDS[declared].flavor, reviewer: null });
    await wait(800);
    if (!aliveRef.current) return;
    const view = buildChallengeView(gameRef.current);
    if (!view) {
      setBusy(false);
      return;
    }
    setStatus((s) => ({ ...s, reviewer: 'think' }));
    setSpeech({ player: null, reviewer: THINK_LINES[Math.floor(Math.random() * THINK_LINES.length)] });
    await wait(900);
    if (!aliveRef.current) return;
    const challenge = decideReviewerChallenge(view, ctx);
    setSpeech({ player: null, reviewer: challenge ? 'I CHALLENGE that!' : 'Fine. Accepted.' });
    await wait(500);
    const res = respondToPlay(gameRef.current, challenge, ctx);
    if (!res.ok) {
      setBusy(false);
      return;
    }
    commit(res.state);
    if (res.state.lastResolution) await animateResolution(res.state.lastResolution);
    if (!aliveRef.current) return;
    await handleGameOverIfNeeded();
    setBusy(false);
  };

  const playerRespond = async (challenge: boolean) => {
    if (busyRef.current) return;
    const s = gameRef.current;
    if (s.phase !== 'awaiting_player_challenge') return;
    if (challenge && !canChallenge(s.player, ctx)) return;
    setBusy(true);
    audio.play('click');
    setSpeech({ player: challenge ? 'Objection!' : 'Fair enough.', reviewer: null });
    const res = respondToPlay(s, challenge, ctx);
    if (!res.ok) {
      setBusy(false);
      return;
    }
    commit(res.state);
    await wait(300);
    if (res.state.lastResolution) await animateResolution(res.state.lastResolution);
    if (!aliveRef.current) return;
    await handleGameOverIfNeeded();
    setBusy(false);
  };

  const playerEndTurn = async () => {
    if (busyRef.current) return;
    const r = endTurn(gameRef.current, 'player', ctx);
    if (!r.ok) return;
    setBusy(true);
    audio.play('click');
    commit(r.state);
    await showTurnBanner('reviewer');
    setBusy(false);
  };

  const runReviewerStep = useCallback(async () => {
    if (busyRef.current) return;
    const s = gameRef.current;
    if (s.phase !== 'reviewer_turn') return;
    setBusy(true);
    setStatus((st) => ({ ...st, reviewer: 'think' }));
    await wait(850);
    if (!aliveRef.current) return;
    const action = decideReviewerAction(buildReviewerView(gameRef.current), ctx);
    setStatus((st) => ({ ...st, reviewer: 'idle' }));
    if (action.type === 'end') {
      const r = endTurn(gameRef.current, 'reviewer', ctx);
      if (r.ok) {
        commit(r.state);
        setSpeech({ player: null, reviewer: 'I am done. For now.' });
        await wait(700);
        setSpeech({ player: null, reviewer: null });
        if (await handleGameOverIfNeeded()) {
          setBusy(false);
          return;
        }
        await showTurnBanner('player');
      }
      setBusy(false);
      return;
    }
    const r = declarePlay(gameRef.current, 'reviewer', action.instanceId, action.declaredCardId, ctx);
    if (!r.ok) {
      const e = endTurn(gameRef.current, 'reviewer', ctx);
      if (e.ok) commit(e.state);
      setBusy(false);
      return;
    }
    commit(r.state);
    audio.play('play');
    showFloat('reviewer', `-${r.state.pendingPlay!.declaredCost} AP`, 'ap', false);
    const lines = REVIEWER_LINES[action.declaredCardId];
    setSpeech({ player: null, reviewer: lines[Math.floor(Math.random() * lines.length)] });
    setStage({
      key: stageKey.current++,
      actorSide: 'reviewer',
      declaredCardId: action.declaredCardId,
      ownActualCardId: null,
      revealedCardId: null,
      flipped: false,
      verdict: 'pending',
    });
    await wait(500);
    setBusy(false);
  }, [commit, ctx, showTurnBanner]);

  useEffect(() => {
    if (game.phase === 'reviewer_turn' && !busy) void runReviewerStep();
  }, [game, busy, runReviewerStep]);

  const restart = () => {
    if (busyRef.current) return;
    audio.play('click');
    const s = createGame(ctx);
    commit(s);
    setStage(null);
    setBanner(null);
    setPeek(null);
    setShowGameOver(false);
    setStatus({ player: 'idle', reviewer: 'idle' });
    setSpeech({ player: null, reviewer: null });
    void showTurnBanner('player');
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    speedRef.current = next;
    setSpeed(next);
    audio.play('click');
  };

  const p = game.player;
  const isPlayerTurn = game.phase === 'player_turn' && !busy;
  const canPlay = canPlayAnything(p, ctx);
  const awaitingPlayer = game.phase === 'awaiting_player_challenge' && !busy;
  const playerCanChallenge = canChallenge(p, ctx);
  const over = game.phase === 'game_over';

  return (
    <div className="game-screen">
      <StatusBar game={game} authorImg={authorImg} reviewerImg={ASSETS.reviewer} />

      <div className="stage stage-bg">
        <div className="stage-screen">
          <div className="screen-title">REBUTTAL SESSION</div>
          <div className="screen-sub">Paper #4242 · "Attention Is Almost All You Need"</div>
        </div>

        <Character
          side="player"
          img={authorImg}
          name="Author"
          status={status.player}
          shield={totalShield(game.player)}
          floats={floats.filter((f) => f.side === 'player')}
          speech={speech.player}
          active={game.activeSide === 'player'}
          defeated={over && game.player.hp <= 0}
        />
        <Character
          side="reviewer"
          img={ASSETS.reviewer}
          name="Reviewer #2"
          status={status.reviewer}
          shield={totalShield(game.reviewer)}
          floats={floats.filter((f) => f.side === 'reviewer')}
          speech={speech.reviewer}
          active={game.activeSide === 'reviewer'}
          defeated={over && game.reviewer.hp <= 0}
        />

        <div className={`center-zone ${awaitingPlayer ? 'compact' : ''}`}>
          {stage && (
            <div className={`stage-card from-${stage.actorSide}`} key={stage.key}>
              <div className="declare-label">
                {stage.actorSide === 'player' ? 'You declare' : 'Reviewer declares'}:{' '}
                <b className={`cat-text-${CARDS[stage.declaredCardId].category}`}>{CARDS[stage.declaredCardId].name}!</b>
              </div>
              <div className={`flip-card ${stage.flipped ? 'flipped' : ''}`}>
                <div className="flip-inner">
                  <div className="flip-front">
                    <CardBack />
                    {stage.verdict === 'accepted' && <div className="card-stamp accepted">ACCEPTED</div>}
                  </div>
                  <div className="flip-back">
                    {stage.revealedCardId && (
                      <CardFace
                        cardId={stage.revealedCardId}
                        stamp={stage.verdict === 'caught' ? 'BLUFF' : stage.verdict === 'false' ? 'TRUE' : undefined}
                      />
                    )}
                  </div>
                </div>
              </div>
              {stage.ownActualCardId && !stage.flipped && (
                <div className="own-actual">
                  你的真实卡牌：{CARDS[stage.ownActualCardId].name}
                  {stage.ownActualCardId !== stage.declaredCardId ? '（虚张声势中……）' : ''}
                </div>
              )}
              <div className="declared-effect">宣称效果：{CARDS[stage.declaredCardId].description}</div>
            </div>
          )}

          {awaitingPlayer && game.pendingPlay && (
            <div className="respond-panel">
              <div className="respond-title">
                Reviewer declares: <b>{CARDS[game.pendingPlay.declaredCardId].name}</b>
              </div>
              <div className="respond-hint">
                质疑成功：你 +1 AP，Reviewer 受罚并执行真实牌。质疑失败：你 -1 AP。
              </div>
              <div className="respond-actions">
                <button className="btn accept-btn" onClick={() => void playerRespond(false)}>
                  Accept
                </button>
                <button
                  className="btn challenge-btn"
                  disabled={!playerCanChallenge}
                  onClick={() => void playerRespond(true)}
                  title={playerCanChallenge ? '' : '需要至少 1 AP 才能质疑'}
                >
                  Challenge
                </button>
              </div>
              {!playerCanChallenge && <div className="respond-warn">你的 AP 为 0，无法质疑</div>}
            </div>
          )}

          {banner && (
            <div className={`result-banner banner-${banner.kind}`} key={banner.text}>
              {banner.text}
            </div>
          )}
        </div>

        {turnBanner && <div className="turn-banner">{turnBanner}</div>}
        {toast && <div className="toast">{toast}</div>}
      </div>

      <div className="hand-area">
        <div className="hand-controls">
          <button className="btn small ghost" onClick={() => setLogOpen((o) => !o)}>
            {logOpen ? '隐藏记录' : 'Action Log'}
          </button>
          <button className="btn small ghost" onClick={cycleSpeed} title="加快动画">
            速度 x{speed}
          </button>
          <button className="btn small ghost" onClick={onMenu}>
            菜单
          </button>
        </div>
        <div className="hand">
          {p.hand.length === 0 && <div className="hand-empty">没有手牌</div>}
          {p.hand.map((card, i) => {
            const cost = getCost(p, card.cardId, ctx);
            const disabled = !isPlayerTurn || !canPlay;
            return (
              <button
                key={card.instanceId}
                className={`hand-card ${disabled ? 'disabled' : ''}`}
                style={{ ['--i' as string]: i, ['--n' as string]: p.hand.length }}
                disabled={disabled}
                onClick={() => {
                  audio.play('click');
                  setSelected(card);
                }}
              >
                <CardFace cardId={card.cardId} cost={cost} />
              </button>
            );
          })}
        </div>
        <div className="end-turn-wrap">
          <div className="turn-hint">
            {over
              ? '游戏结束'
              : game.phase === 'player_turn'
                ? canPlay
                  ? '选择一张牌出牌，或结束回合'
                  : 'AP 不足，无法继续出牌'
                : game.phase === 'awaiting_player_challenge'
                  ? '请回应 Reviewer 的宣称'
                  : game.phase === 'awaiting_reviewer_challenge' || busy
                    ? '结算中……'
                    : 'Reviewer #2 正在行动……'}
          </div>
          <button
            className={`btn end-turn ${isPlayerTurn && !canPlay ? 'pulse' : ''}`}
            disabled={!isPlayerTurn}
            onClick={() => void playerEndTurn()}
          >
            End Turn
          </button>
        </div>
      </div>

      <ActionLog history={game.history} open={logOpen} onClose={() => setLogOpen(false)} />

      {selected && game.phase === 'player_turn' && (
        <DeclareModal
          card={selected}
          player={p}
          suspicion={game.suspicion}
          reviewerAp={game.reviewer.ap}
          onCancel={() => setSelected(null)}
          onConfirm={(d) => void playerDeclare(selected.instanceId, d)}
        />
      )}

      {peek && (
        <div className="modal-backdrop" onClick={() => setPeek(null)}>
          <div className="modal peek-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Investigation 结果</h2>
            {peek.cardId ? (
              <>
                <p>你偷看到 Reviewer #2 手中有一张：</p>
                <CardFace cardId={peek.cardId} />
              </>
            ) : (
              <p>Reviewer #2 没有手牌，调查一无所获。</p>
            )}
            <div className="modal-actions">
              <button className="btn primary" onClick={() => setPeek(null)}>
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {showGameOver && game.result && <GameOver game={game} onPlayAgain={restart} onMenu={onMenu} />}
    </div>
  );
}
