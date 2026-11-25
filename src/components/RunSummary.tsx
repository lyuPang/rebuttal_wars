import { useState } from 'react';
import type { RunState } from '../game/run';
import { cardName, eventText, paperText, useLang, useT } from '../i18n';
import { CARDS } from '../game/cards';
import { audio } from '../audio';

interface Props {
  run: RunState;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function RunSummary({ run, onPlayAgain, onMenu }: Props) {
  const tx = useT();
  const lang = useLang();
  const [showDeck, setShowDeck] = useState(false);
  const result = run.finalResult ?? 'reject';
  const t = tx.outcomeRun[result];
  const paperType = paperText(run.paperTypeId, lang);
  const elapsed = Math.round((Date.now() - run.startTime) / 1000);
  const battlesFought = run.battleResults.length;
  const totalRounds = run.battleResults.reduce((a, b) => a + b.rounds, 0);
  const totalStats = run.battleResults.reduce(
    (acc, b) => ({
      successfulBluffs: acc.successfulBluffs + b.stats.playerSuccessfulBluffs,
      caughtBluffs: acc.caughtBluffs + b.stats.playerCaughtBluffs,
      successfulChallenges: acc.successfulChallenges + b.stats.playerSuccessfulChallenges,
      wrongChallenges: acc.wrongChallenges + b.stats.playerWrongChallenges,
    }),
    { successfulBluffs: 0, caughtBluffs: 0, successfulChallenges: 0, wrongChallenges: 0 },
  );
  const deckSize = Object.values(run.deck).reduce((a, b) => a + (b ?? 0), 0);
  const advancedCards = Object.entries(run.deck)
    .filter(([id]) => CARDS[id as keyof typeof CARDS].isAdvanced)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([id, n]) => ({ id, n: n ?? 0 }));

  const [lineSeed] = useState(() => Math.random());
  const line = t.lines[Math.floor(lineSeed * t.lines.length)];

  return (
    <div className="run-summary-screen stage-bg">
      <div className={`run-summary-modal outcome-${result}`}>
        <div className="stamp">{t.title}</div>
        <h2>{t.sub}</h2>
        <p className="gameover-line">{line}</p>

        <div className="summary-grid">
          <div><span>{tx.author}</span><b>{run.characterId === 'male' ? tx.male : tx.female}</b></div>
          <div><span>{tx.paperType}</span><b>{paperType.name}</b></div>
          <div><span>{tx.reviewersDefeated}</span><b>{run.battleResults.filter((r) => r.outcome !== 'reject').length}</b></div>
          <div><span>{tx.finalHp}</span><b>{run.hp} / {run.maxHp}</b></div>
          <div><span>{tx.battlesFought}</span><b>{battlesFought}</b></div>
          <div><span>{tx.totalRounds}</span><b>{totalRounds}</b></div>
          <div><span>{tx.runTime}</span><b>{tx.runTimeValue(elapsed)}</b></div>
          <div><span>{tx.finalDeckSize}</span><b>{deckSize}</b></div>
        </div>

        <div className="summary-grid summary-battle-stats">
          <div><span>{tx.successfulBluffs}</span><b>{totalStats.successfulBluffs}</b></div>
          <div><span>{tx.bluffsCaught}</span><b>{totalStats.caughtBluffs}</b></div>
          <div><span>{tx.successfulChallenges}</span><b>{totalStats.successfulChallenges}</b></div>
          <div><span>{tx.wrongChallenges}</span><b>{totalStats.wrongChallenges}</b></div>
        </div>

        {(advancedCards.length > 0) && (
          <div className="summary-advanced">
            <div className="summary-section-title">{tx.advancedAcquired}</div>
            <div className="advanced-list">
              {advancedCards.map(({ id, n }) => (
                <span key={id} className="advanced-chip">
                  {cardName(id as keyof typeof CARDS, lang)}{n > 1 ? ` ×${n}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {run.eventHistory.length > 0 && (
          <div className="summary-events">
            <div className="summary-section-title">{tx.eventsEncountered}</div>
            {run.eventHistory.map((eh, i) => {
              const ev = eventText(eh.eventId, lang);
              return (
                <div key={i} className="event-history-row">
                  <span className="eh-name">{ev.name}</span>
                  <span className="eh-choice">{ev.options[eh.chosenOption].label}</span>
                </div>
              );
            })}
          </div>
        )}

        {showDeck && (
          <div className="final-deck-list">
            <div className="summary-section-title">{tx.finalDeck}</div>
            {Object.entries(run.deck).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => (
              <div key={id} className="deck-row">
                <span className={`cat-text-${CARDS[id as keyof typeof CARDS].category}`}>
                  {cardName(id as keyof typeof CARDS, lang)}
                </span>
                <span>×{n}</span>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={() => { audio.play('click'); onMenu(); }}>{tx.mainMenu}</button>
          <button className="btn" onClick={() => { audio.play('click'); setShowDeck((v) => !v); }}>
            {showDeck ? tx.hideDeck : tx.viewFinalDeck}
          </button>
          <button className="btn primary" onClick={() => { audio.play('click'); onPlayAgain(); }}>
            {tx.playAgain}
          </button>
        </div>
      </div>
    </div>
  );
}
