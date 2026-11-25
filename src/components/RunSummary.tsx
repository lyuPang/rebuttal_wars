import { useState } from 'react';
import type { RunState } from '../game/run';
import { PAPER_TYPES, RANDOM_EVENTS } from '../game/run';
import { CARDS } from '../game/cards';
import { audio } from '../audio';

interface Props {
  run: RunState;
  onPlayAgain: () => void;
  onMenu: () => void;
}

const OUTCOME_TEXT = {
  accept: { title: 'ACCEPT', sub: 'Paper Accepted!', lines: [
    "Reviewer #2 changed their score from 3 to 6: \"The authors have addressed most of my concerns.\"",
    'Congratulations! Remember to thank Reviewer #2 in the acknowledgements (don\'t actually).',
    'Meta-review: "After a heated discussion, the AC recommends acceptance."',
  ]},
  weak_accept: { title: 'WEAK ACCEPT', sub: 'Borderline... but in!', lines: [
    'Reviewer #2: "I remain unconvinced, but will not stand in the way."',
    'The legendary borderline paper. The AC flipped a coin — heads.',
  ]},
  reject: { title: 'REJECT', sub: 'Paper Rejected', lines: [
    'Reviewer #2: "The novelty is limited and the experiments are insufficient."',
    'Don\'t give up — the next conference deadline is only 3 weeks away.',
    'Reviewer #2 suggests citing their 7 papers and resubmitting.',
  ]},
} as const;

export function RunSummary({ run, onPlayAgain, onMenu }: Props) {
  const [showDeck, setShowDeck] = useState(false);
  const result = run.finalResult ?? 'reject';
  const t = OUTCOME_TEXT[result];
  const paperType = PAPER_TYPES[run.paperTypeId];
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

  const line = t.lines[Math.floor(Math.random() * t.lines.length)];

  return (
    <div className="run-summary-screen stage-bg">
      <div className={`run-summary-modal outcome-${result}`}>
        <div className="stamp">{t.title}</div>
        <h2>{t.sub}</h2>
        <p className="gameover-line">{line}</p>

        <div className="summary-grid">
          <div><span>Author</span><b>{run.characterId === 'male' ? 'Male' : 'Female'}</b></div>
          <div><span>Paper Type</span><b>{paperType.name}</b></div>
          <div><span>Reviewers Defeated</span><b>{run.battleResults.filter((r) => r.outcome !== 'reject').length}</b></div>
          <div><span>Final HP</span><b>{run.hp} / {run.maxHp}</b></div>
          <div><span>Battles Fought</span><b>{battlesFought}</b></div>
          <div><span>Total Rounds</span><b>{totalRounds}</b></div>
          <div><span>Run Time</span><b>{Math.floor(elapsed / 60)}m {elapsed % 60}s</b></div>
          <div><span>Final Deck Size</span><b>{deckSize}</b></div>
        </div>

        <div className="summary-grid summary-battle-stats">
          <div><span>Successful Bluffs</span><b>{totalStats.successfulBluffs}</b></div>
          <div><span>Bluffs Caught</span><b>{totalStats.caughtBluffs}</b></div>
          <div><span>Successful Challenges</span><b>{totalStats.successfulChallenges}</b></div>
          <div><span>Wrong Challenges</span><b>{totalStats.wrongChallenges}</b></div>
        </div>

        {(advancedCards.length > 0) && (
          <div className="summary-advanced">
            <div className="summary-section-title">Advanced Cards Acquired</div>
            <div className="advanced-list">
              {advancedCards.map(({ id, n }) => (
                <span key={id} className="advanced-chip">
                  {CARDS[id as keyof typeof CARDS].name}{n > 1 ? ` ×${n}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {run.eventHistory.length > 0 && (
          <div className="summary-events">
            <div className="summary-section-title">Events Encountered</div>
            {run.eventHistory.map((eh, i) => {
              const ev = RANDOM_EVENTS[eh.eventId];
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
            <div className="summary-section-title">Final Deck</div>
            {Object.entries(run.deck).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => (
              <div key={id} className="deck-row">
                <span className={`cat-text-${CARDS[id as keyof typeof CARDS].category}`}>
                  {CARDS[id as keyof typeof CARDS].name}
                </span>
                <span>×{n}</span>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={() => { audio.play('click'); onMenu(); }}>Main Menu</button>
          <button className="btn" onClick={() => { audio.play('click'); setShowDeck((v) => !v); }}>
            {showDeck ? 'Hide Deck' : 'View Final Deck'}
          </button>
          <button className="btn primary" onClick={() => { audio.play('click'); onPlayAgain(); }}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
