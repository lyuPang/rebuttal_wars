import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CARDS, CATEGORY_LABEL } from '../game/cards';
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
  totalPermanentShield,
  totalTemporaryShield,
} from '../game/engine';
import { buildChallengeView, buildReviewerView, decideReviewerAction, decideReviewerChallenge } from '../game/ai';
import type { CardId, CardInstance, GameState, Resolution, Side } from '../game/types';
import type { ReviewerConfig } from '../game/reviewers';
import type { RenderOptions } from '../game/run';
import { audio } from '../audio';
import { ASSETS, authorImage, type AuthorKind } from '../assets';
import { Character, type CharStatus, type FloatText } from './Character';
import { StatusBar } from './StatusBar';
import { DeclareModal } from './DeclareModal';
import { ActionLog } from './ActionLog';
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

interface Props {
  author: AuthorKind;
  reviewerProfile: ReviewerConfig;
  render: RenderOptions;
  onBattleEnd: (result: {
    outcome: 'accept' | 'weak_accept' | 'reject';
    playerHp: number;
    rounds: number;
    stats: GameState['stats'];
  }) => void;
  onMenu: () => void;
}

export function GameScreen({ author, reviewerProfile, render, onBattleEnd, onMenu }: Props) {
  const ctx = useMemo(() => makeContext(reviewerProfile.gameConfig), [reviewerProfile]);

  const [game, setGame] = useState<GameState>(() =>
    createGame(ctx, {
      reviewerProfile,
      playerHp: render.playerHp,
      playerMaxHp: render.playerMaxHp,
      playerDeck: render.deck,
      playerClaimPool: render.claimPool,
      startingApDelta: render.pendingBattleModifiers.startingApDelta,
      startingHandDelta: render.pendingBattleModifiers.startingHandDelta,
      startingCrossCheckCharges: render.pendingBattleModifiers.startingCrossCheckCharges,
      opponentSuspicionDelta: render.pendingBattleModifiers.opponentSuspicionDelta,
    }),
  );
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
  const [crossCheckNotice, setCrossCheckNotice] = useState<{ category: string; mismatch: boolean } | null>(null);
  const endedRef = useRef(false);
  const floatId = useRef(1);
  const stageKey = useRef(1);

  const authorImg = authorImage(author);
  const reviewerImg = reviewerProfile.id === 'reviewer1' ? ASSETS.reviewer1 : ASSETS.reviewer;

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

  const showTurnBanner = useCallback(
    async (side: Side) => {
      setTurnBanner(side === 'player' ? 'YOUR TURN' : `${reviewerProfile.name.toUpperCase()}'S TURN`);
      audio.play('turn');
      await wait(900);
      if (aliveRef.current) setTurnBanner(null);
    },
    [reviewerProfile.name],
  );

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
      if (d.shield) mk(`${d.shield > 0 ? '+' : ''}${d.shield} Shield`, 'shield', d.shield > 0);
      if (d.ap) mk(`${d.ap > 0 ? '+' : ''}${d.ap} AP`, 'ap', d.ap > 0);
      if (d.apDebt) mk(`Debt ${d.apDebt > 0 ? '+' : ''}${d.apDebt}`, 'debt', d.apDebt < 0);
    });
    if (res.cardsDrawn) {
      items.push({
        id: floatId.current++,
        side: res.actorSide,
        text: `Draw ${res.cardsDrawn}`,
        kind: 'info',
        positive: true,
      });
    }
    if (res.crossCheckGranted) {
      items.push({ id: floatId.current++, side: res.actorSide, text: 'Cross-check +1', kind: 'info', positive: true });
    }
    if (res.burdenOfProofGranted) {
      items.push({ id: floatId.current++, side: res.actorSide, text: 'Burden of Proof', kind: 'info', positive: true });
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
    if ((eff.kind === 'damage' || eff.kind === 'damage_conditional') && res.damage) {
      next[res.actorSide] = 'attack';
      next[res.damage.target] = res.damage.hpLoss > 0 ? 'damage' : 'block';
      audio.play(res.damage.hpLoss > 0 ? 'hit' : 'block');
      if (res.damage.absorbed > 0) showFloat(res.damage.target, `Shield absorbed ${res.damage.absorbed}`, 'shield', true);
      if (res.damage.pierce && res.damage.hpLoss > 0) showFloat(res.damage.target, 'PIERCE!', 'info', false);
    } else if (eff.kind === 'shield') {
      next[res.actorSide] = 'defense';
      audio.play('shield');
    } else if (eff.kind === 'draw') {
      audio.play('draw');
    } else if (eff.kind === 'gain_ap') {
      audio.play('accept');
    } else if (eff.kind === 'peek') {
      audio.play('peek');
    } else if (eff.kind === 'cross_check' || eff.kind === 'burden_of_proof') {
      audio.play('peek');
    }
    if (res.usedBurdenOfProof) {
      showFloat(opponentOf(res.actorSide), 'Burden of Proof used', 'info', true);
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
      setToast(
        res.peekedCardId === undefined || res.peekedCardId === null
          ? `${reviewerProfile.name} tried to peek at your hand, but it was empty.`
          : `${reviewerProfile.name} peeked at one of your cards...`,
      );
      window.setTimeout(() => aliveRef.current && setToast(null), 2200);
    }
  };

  const finishBattleIfNeeded = async () => {
    const s = gameRef.current;
    if (s.phase !== 'game_over' || !s.result) return false;
    if (endedRef.current) return true;
    endedRef.current = true;
    await wait(700);
    audio.play(s.result.outcome === 'reject' ? 'lose' : 'win');
    onBattleEnd({
      outcome: s.result.outcome,
      playerHp: s.player.hp,
      rounds: s.round,
      stats: s.stats,
    });
    return true;
  };

  const showCrossCheckNotice = (revealed: string | null, declared: CardId) => {
    if (!revealed) {
      setCrossCheckNotice(null);
      return;
    }
    const mismatch = revealed !== CATEGORY_LABEL[CARDS[declared].category];
    setCrossCheckNotice({ category: revealed, mismatch });
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

    const csCategory = r.state.pendingPlay?.crossCheckRevealedCategory ?? null;
    if (csCategory) {
      showCrossCheckNotice(CATEGORY_LABEL[csCategory], declared);
      await wait(1100);
      setCrossCheckNotice(null);
      if (!aliveRef.current) return;
    }

    const view = buildChallengeView(gameRef.current);
    if (!view) {
      setBusy(false);
      return;
    }
    setStatus((s) => ({ ...s, reviewer: 'think' }));
    setSpeech({
      player: null,
      reviewer: reviewerProfile.thinkLines[Math.floor(Math.random() * reviewerProfile.thinkLines.length)],
    });
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
    await finishBattleIfNeeded();
    setBusy(false);
  };

  const playerRespond = async (challenge: boolean) => {
    if (busyRef.current) return;
    const s = gameRef.current;
    if (s.phase !== 'awaiting_player_challenge') return;
    if (challenge && !canChallenge(s.player, ctx)) return;

    if (s.pendingPlay?.crossCheckRevealedCategory) {
      showCrossCheckNotice(CATEGORY_LABEL[s.pendingPlay.crossCheckRevealedCategory], s.pendingPlay.declaredCardId);
      await wait(900);
      setCrossCheckNotice(null);
      if (!aliveRef.current) return;
    }

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
    await finishBattleIfNeeded();
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
    const action = decideReviewerAction(buildReviewerView(gameRef.current, ctx), ctx);
    setStatus((st) => ({ ...st, reviewer: 'idle' }));
    if (action.type === 'end') {
      const r = endTurn(gameRef.current, 'reviewer', ctx);
      if (r.ok) {
        commit(r.state);
        setSpeech({ player: null, reviewer: 'I am done. For now.' });
        await wait(700);
        setSpeech({ player: null, reviewer: null });
        if (await finishBattleIfNeeded()) {
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
    const lines = reviewerProfile.lines[action.declaredCardId] ?? ['...'];
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
  }, [commit, ctx, showTurnBanner, reviewerProfile]);

  useEffect(() => {
    if (game.phase === 'reviewer_turn' && !busy) void runReviewerStep();
  }, [game, busy, runReviewerStep]);

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
  const playerFreeChallenge = p.burdenOfProofActive && p.ap < 1;
  const over = game.phase === 'game_over';
  const pendingDeclared = game.pendingPlay ? CARDS[game.pendingPlay.declaredCardId] : null;
  const pendingCsCategory = game.pendingPlay?.crossCheckRevealedCategory ?? null;
  const pendingCsMismatch =
    pendingCsCategory && pendingDeclared ? CATEGORY_LABEL[pendingCsCategory] !== pendingDeclared.category : false;

  return (
    <div className="game-screen">
      <StatusBar game={game} authorImg={authorImg} reviewerImg={reviewerImg} />

      <div className="stage stage-bg">
        <div className="stage-screen">
          <div className="screen-title">REBUTTAL SESSION</div>
          <div className="screen-sub">
            Paper #4242 · {reviewerProfile.id === 'reviewer1' ? 'First Review' : 'Final Rebuttal'}
          </div>
        </div>

        <Character
          side="player"
          img={authorImg}
          name="Author"
          status={status.player}
          shield={totalTemporaryShield(game.player) + totalPermanentShield(game.player)}
          floats={floats.filter((f) => f.side === 'player')}
          speech={speech.player}
          active={game.activeSide === 'player'}
          defeated={over && game.player.hp <= 0}
        />
        <Character
          side="reviewer"
          img={reviewerImg}
          name={reviewerProfile.name}
          status={status.reviewer}
          shield={totalTemporaryShield(game.reviewer) + totalPermanentShield(game.reviewer)}
          floats={floats.filter((f) => f.side === 'reviewer')}
          speech={speech.reviewer}
          active={game.activeSide === 'reviewer'}
          defeated={over && game.reviewer.hp <= 0}
        />

        <div className={`center-zone ${awaitingPlayer ? 'compact' : ''}`}>
          {stage && (
            <div className={`stage-card from-${stage.actorSide}`} key={stage.key}>
              <div className="declare-label">
                {stage.actorSide === 'player' ? 'You declare' : `${reviewerProfile.name} declares`}:{' '}
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
                  Your actual card: {CARDS[stage.ownActualCardId].name}
                  {stage.ownActualCardId !== stage.declaredCardId ? ' (bluffing...)' : ''}
                </div>
              )}
              <div className="declared-effect">Declared effect: {CARDS[stage.declaredCardId].description}</div>
            </div>
          )}

          {crossCheckNotice && (
            <div className={`crosscheck-notice ${crossCheckNotice.mismatch ? 'mismatch' : 'match'}`}>
              <div className="cs-title">CROSS-CHECK</div>
              <div className="cs-body">
                Actual card category: <b>{crossCheckNotice.category}</b>
              </div>
              {crossCheckNotice.mismatch && <div className="cs-warn">⚠ Category mismatch detected!</div>}
            </div>
          )}

          {awaitingPlayer && game.pendingPlay && pendingDeclared && (
            <div className="respond-panel">
              <div className="respond-title">
                {reviewerProfile.name} declares: <b>{pendingDeclared.name}</b>
              </div>
              {pendingCsCategory && (
                <div className={`respond-crosscheck ${pendingCsMismatch ? 'mismatch' : ''}`}>
                  CROSS-CHECK reveals: <b>{CATEGORY_LABEL[pendingCsCategory]}</b>
                  {pendingCsMismatch ? ' — declared category differs!' : ''}
                </div>
              )}
              <div className="respond-hint">
                Challenge success: +1 AP, reviewer penalized, actual card resolves. Challenge fail: -1 AP.
                {playerFreeChallenge && (
                  <span className="burden-hint"> Burden of Proof: free challenge, success grants +2 AP.</span>
                )}
              </div>
              <div className="respond-actions">
                <button className="btn accept-btn" onClick={() => void playerRespond(false)}>
                  Accept
                </button>
                <button
                  className={`btn challenge-btn ${playerFreeChallenge ? 'free' : ''}`}
                  disabled={!playerCanChallenge}
                  onClick={() => void playerRespond(true)}
                  title={playerCanChallenge ? '' : 'Need at least 1 AP to challenge'}
                >
                  {playerFreeChallenge ? 'Special Challenge' : 'Challenge'}
                </button>
              </div>
              {!playerCanChallenge && <div className="respond-warn">You have 0 AP and no Burden of Proof</div>}
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
            {logOpen ? 'Hide Log' : 'Action Log'}
          </button>
          <button className="btn small ghost" onClick={cycleSpeed} title="Speed up animations">
            Speed x{speed}
          </button>
          <button className="btn small ghost" onClick={onMenu}>
            Menu
          </button>
        </div>
        <div className="hand">
          {p.hand.length === 0 && <div className="hand-empty">No cards in hand</div>}
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
              ? 'Battle over'
              : game.phase === 'player_turn'
                ? canPlay
                  ? 'Pick a card to play, or end your turn'
                  : 'Not enough AP to play anything'
                : game.phase === 'awaiting_player_challenge'
                  ? 'Respond to the reviewer declaration'
                  : game.phase === 'awaiting_reviewer_challenge' || busy
                    ? 'Resolving...'
                    : `${reviewerProfile.name} is acting...`}
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
          reviewerHasBurdenOfProof={game.reviewer.burdenOfProofActive}
          onCancel={() => setSelected(null)}
          onConfirm={(d) => void playerDeclare(selected.instanceId, d)}
        />
      )}

      {peek && (
        <div className="modal-backdrop" onClick={() => setPeek(null)}>
          <div className="modal peek-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Investigation Result</h2>
            {peek.cardId ? (
              <>
                <p>You peeked at one of {reviewerProfile.name}'s cards:</p>
                <CardFace cardId={peek.cardId} />
              </>
            ) : (
              <p>{reviewerProfile.name} has no cards in hand. Investigation found nothing.</p>
            )}
            <div className="modal-actions">
              <button className="btn primary" onClick={() => setPeek(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
