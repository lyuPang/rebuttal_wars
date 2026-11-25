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
  totalPermanentShield,
  totalTemporaryShield,
} from '../game/engine';
import { buildChallengeView, buildReviewerView, decideReviewerAction, decideReviewerChallenge } from '../game/ai';
import type { CardId, CardInstance, Category, GameState, Resolution, Side } from '../game/types';
import type { ReviewerConfig } from '../game/reviewers';
import type { RenderOptions } from '../game/run';
import { audio } from '../audio';
import { ASSETS, authorImage, type AuthorKind } from '../assets';
import { Character, type CharStatus, type FloatText } from './Character';
import { StatusBar } from './StatusBar';
import { DeclareModal } from './DeclareModal';
import { ActionLog } from './ActionLog';
import { CardBack, CardFace } from './Card';
import { cardText, categoryLabel, reviewerLabel, reviewerLines, reviewerThinkLines, uiText, useLang, useT } from '../i18n';

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
  const [crossCheckNotice, setCrossCheckNotice] = useState<{ category: Category; mismatch: boolean } | null>(null);
  const endedRef = useRef(false);
  const floatId = useRef(1);
  const stageKey = useRef(1);

  const t = useT();
  const lang = useLang();
  const rname = reviewerLabel(reviewerProfile.name, lang);
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
      const u = uiText();
      setTurnBanner(side === 'player' ? u.yourTurnBanner : u.reviewerTurnBanner(reviewerLabel(reviewerProfile.name)));
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
    const u = uiText();
    const items: FloatText[] = [];
    (['player', 'reviewer'] as Side[]).forEach((side) => {
      const d = res.deltas[side];
      const mk = (text: string, kind: FloatText['kind'], positive: boolean) =>
        items.push({ id: floatId.current++, side, text, kind, positive });
      if (d.hp) mk(u.floatHp(d.hp), 'hp', d.hp > 0);
      if (d.shield) mk(u.floatShield(d.shield), 'shield', d.shield > 0);
      if (d.ap) mk(u.floatAp(d.ap), 'ap', d.ap > 0);
      if (d.apDebt) mk(u.floatDebt(d.apDebt), 'debt', d.apDebt < 0);
    });
    if (res.cardsDrawn) {
      items.push({
        id: floatId.current++,
        side: res.actorSide,
        text: u.floatDraw(res.cardsDrawn),
        kind: 'info',
        positive: true,
      });
    }
    if (res.crossCheckGranted) {
      items.push({ id: floatId.current++, side: res.actorSide, text: u.floatCrossCheck, kind: 'info', positive: true });
    }
    if (res.burdenOfProofGranted) {
      items.push({ id: floatId.current++, side: res.actorSide, text: u.floatBurden, kind: 'info', positive: true });
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
    const u = uiText();
    const challenger = opponentOf(res.actorSide);
    if (res.challenged) {
      const caught = res.outcome === 'challenge_success';
      setStage((st) => (st ? { ...st, revealedCardId: res.revealedCardId, flipped: true, verdict: caught ? 'caught' : 'false' } : st));
      setBanner({ text: caught ? u.bannerCaught : u.bannerFalse, kind: caught ? 'caught' : 'false' });
      setStatus({
        [challenger]: caught ? 'challenge_success' : 'challenge_fail',
        [res.actorSide]: caught ? 'challenge_fail' : 'challenge_success',
      } as Record<Side, CharStatus>);
      audio.play(caught ? 'challenge_success' : 'challenge_fail');
      await wait(1300);
    } else {
      setStage((st) => (st ? { ...st, verdict: 'accepted' } : st));
      setBanner({ text: u.bannerAccepted, kind: 'accepted' });
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
      if (res.damage.absorbed > 0) showFloat(res.damage.target, u.floatAbsorbed(res.damage.absorbed), 'shield', true);
      if (res.damage.pierce && res.damage.hpLoss > 0) showFloat(res.damage.target, u.floatPierce, 'info', false);
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
      showFloat(opponentOf(res.actorSide), u.floatBurdenUsed, 'info', true);
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
          ? u.toastPeekEmpty(reviewerLabel(reviewerProfile.name))
          : u.toastPeeked(reviewerLabel(reviewerProfile.name)),
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

  const showCrossCheckNotice = (revealed: Category | null, declared: CardId) => {
    if (!revealed) {
      setCrossCheckNotice(null);
      return;
    }
    const mismatch = revealed !== CARDS[declared].category;
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
    setSpeech({ player: cardText(declared).flavor, reviewer: null });
    await wait(800);
    if (!aliveRef.current) return;

    const csCategory = r.state.pendingPlay?.crossCheckRevealedCategory ?? null;
    if (csCategory) {
      showCrossCheckNotice(csCategory, declared);
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
      reviewer: (() => {
        const lines = reviewerThinkLines(reviewerProfile);
        return lines[Math.floor(Math.random() * lines.length)];
      })(),
    });
    await wait(900);
    if (!aliveRef.current) return;
    const challenge = decideReviewerChallenge(view, ctx);
    setSpeech({ player: null, reviewer: challenge ? uiText().speechReviewerChallenge : uiText().speechReviewerAccept });
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
      showCrossCheckNotice(s.pendingPlay.crossCheckRevealedCategory, s.pendingPlay.declaredCardId);
      await wait(900);
      setCrossCheckNotice(null);
      if (!aliveRef.current) return;
    }

    setBusy(true);
    audio.play('click');
    setSpeech({ player: challenge ? uiText().speechPlayerChallenge : uiText().speechPlayerAccept, reviewer: null });
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
        setSpeech({ player: null, reviewer: uiText().speechReviewerDone });
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
    const lines = reviewerLines(reviewerProfile, action.declaredCardId);
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
    pendingCsCategory && pendingDeclared ? pendingCsCategory !== pendingDeclared.category : false;

  return (
    <div className="game-screen">
      <StatusBar game={game} authorImg={authorImg} reviewerImg={reviewerImg} />

      <div className="stage stage-bg">
        <div className="stage-screen">
          <div className="screen-title">{t.sessionTitle}</div>
          <div className="screen-sub">{t.sessionSub(reviewerProfile.id === 'reviewer1')}</div>
        </div>

        <Character
          side="player"
          img={authorImg}
          name={t.author}
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
          name={rname}
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
                {stage.actorSide === 'player' ? t.youDeclare : t.reviewerDeclares(rname)}
                {lang === 'zh' ? '：' : ': '}
                <b className={`cat-text-${CARDS[stage.declaredCardId].category}`}>
                  {cardText(stage.declaredCardId, lang).name}
                  {lang === 'zh' ? '！' : '!'}
                </b>
              </div>
              <div className={`flip-card ${stage.flipped ? 'flipped' : ''}`}>
                <div className="flip-inner">
                  <div className="flip-front">
                    <CardBack />
                    {stage.verdict === 'accepted' && <div className="card-stamp accepted">{t.stampAccepted}</div>}
                  </div>
                  <div className="flip-back">
                    {stage.revealedCardId && (
                      <CardFace
                        cardId={stage.revealedCardId}
                        stamp={stage.verdict === 'caught' ? t.stampBluff : stage.verdict === 'false' ? t.stampTrue : undefined}
                      />
                    )}
                  </div>
                </div>
              </div>
              {stage.ownActualCardId && !stage.flipped && (
                <div className="own-actual">
                  {t.yourActualCard} {cardText(stage.ownActualCardId, lang).name}
                  {stage.ownActualCardId !== stage.declaredCardId ? t.bluffing : ''}
                </div>
              )}
              <div className="declared-effect">
                {t.declaredEffect} {cardText(stage.declaredCardId, lang).description}
              </div>
            </div>
          )}

          {crossCheckNotice && (
            <div className={`crosscheck-notice ${crossCheckNotice.mismatch ? 'mismatch' : 'match'}`}>
              <div className="cs-title">{t.crossCheck}</div>
              <div className="cs-body">
                {t.actualCategory} <b>{categoryLabel(crossCheckNotice.category, lang)}</b>
              </div>
              {crossCheckNotice.mismatch && <div className="cs-warn">{t.categoryMismatch}</div>}
            </div>
          )}

          {awaitingPlayer && game.pendingPlay && pendingDeclared && (
            <div className="respond-panel">
              <div className="respond-title">
                {t.reviewerDeclares(rname)}
                {lang === 'zh' ? '：' : ': '}
                <b>{cardText(pendingDeclared.id, lang).name}</b>
              </div>
              {pendingCsCategory && (
                <div className={`respond-crosscheck ${pendingCsMismatch ? 'mismatch' : ''}`}>
                  {t.crossCheckReveals} <b>{categoryLabel(pendingCsCategory, lang)}</b>
                  {pendingCsMismatch ? t.declaredDiffers : ''}
                </div>
              )}
              <div className="respond-hint">
                {t.respondHint}
                {playerFreeChallenge && <span className="burden-hint">{t.burdenHint}</span>}
              </div>
              <div className="respond-actions">
                <button className="btn accept-btn" onClick={() => void playerRespond(false)}>
                  {t.accept}
                </button>
                <button
                  className={`btn challenge-btn ${playerFreeChallenge ? 'free' : ''}`}
                  disabled={!playerCanChallenge}
                  onClick={() => void playerRespond(true)}
                  title={playerCanChallenge ? '' : t.needApToChallenge}
                >
                  {playerFreeChallenge ? t.specialChallenge : t.challenge}
                </button>
              </div>
              {!playerCanChallenge && <div className="respond-warn">{t.noApNoBurden}</div>}
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
            {logOpen ? t.hideLog : t.actionLog}
          </button>
          <button className="btn small ghost" onClick={cycleSpeed} title={t.speedTitle}>
            {t.speed(speed)}
          </button>
          <button className="btn small ghost" onClick={onMenu}>
            {t.menu}
          </button>
        </div>
        <div className="hand">
          {p.hand.length === 0 && <div className="hand-empty">{t.noCards}</div>}
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
              ? t.hintOver
              : game.phase === 'player_turn'
                ? canPlay
                  ? t.hintPick
                  : t.hintNoAp
                : game.phase === 'awaiting_player_challenge'
                  ? t.hintRespond
                  : game.phase === 'awaiting_reviewer_challenge' || busy
                    ? t.hintResolving
                    : t.hintActing(rname)}
          </div>
          <button
            className={`btn end-turn ${isPlayerTurn && !canPlay ? 'pulse' : ''}`}
            disabled={!isPlayerTurn}
            onClick={() => void playerEndTurn()}
          >
            {t.endTurn}
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
            <h2>{t.investigationResult}</h2>
            {peek.cardId ? (
              <>
                <p>{t.peekedAt(rname)}</p>
                <CardFace cardId={peek.cardId} />
              </>
            ) : (
              <p>{t.peekNothing(rname)}</p>
            )}
            <div className="modal-actions">
              <button className="btn primary" onClick={() => setPeek(null)}>
                {t.gotIt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
