import { audio } from '../audio';
import type { GameOutcome, GameStats } from '../game/types';

const TEXT = {
  accept: {
    title: 'ACCEPT',
    sub: 'Paper Accepted!',
    lines: [
      'The reviewer changed the score from 3 to 6: "The authors have addressed most of my concerns."',
      'Meta-review: "After a heated discussion, the AC recommends acceptance."',
    ],
  },
  weak_accept: {
    title: 'WEAK ACCEPT',
    sub: 'Borderline... but in!',
    lines: [
      'Reviewer #2: "I remain unconvinced, but will not stand in the way."',
      'The legendary borderline paper. The AC flipped a coin — heads.',
    ],
  },
  reject: {
    title: 'REJECT',
    sub: 'Paper Rejected',
    lines: [
      'Reviewer #2: "The novelty is limited and the experiments are insufficient."',
      'Reviewer #2 suggests citing their 7 papers and resubmitting.',
    ],
  },
} as const;

interface Props {
  outcome: GameOutcome;
  playerHp: number;
  rounds: number;
  stats: GameStats;
  title?: string;
  subtitle?: string;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function BattleResult({ outcome, playerHp, rounds, stats, title, subtitle, onPlayAgain, onMenu }: Props) {
  const t = TEXT[outcome];
  const line = t.lines[(playerHp + rounds) % t.lines.length];

  return (
    <div className="modal-backdrop gameover-backdrop">
      <div className={`modal gameover outcome-${outcome}`}>
        <div className="stamp">{title ?? t.title}</div>
        <h2>{subtitle ?? t.sub}</h2>
        <p className="gameover-line">{line}</p>
        <div className="stats-grid">
          <div>
            <span>Your HP</span>
            <b>{playerHp}</b>
          </div>
          <div>
            <span>Rounds</span>
            <b>{rounds}</b>
          </div>
          <div>
            <span>Successful Bluffs</span>
            <b>{stats.playerSuccessfulBluffs}</b>
          </div>
          <div>
            <span>Bluffs Caught</span>
            <b>{stats.playerCaughtBluffs}</b>
          </div>
          <div>
            <span>Successful Challenges</span>
            <b>{stats.playerSuccessfulChallenges}</b>
          </div>
          <div>
            <span>Wrong Challenges</span>
            <b>{stats.playerWrongChallenges}</b>
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="btn ghost"
            onClick={() => {
              audio.play('click');
              onMenu();
            }}
          >
            Main Menu
          </button>
          <button
            className="btn primary"
            onClick={() => {
              audio.play('click');
              onPlayAgain();
            }}
          >
            Rematch
          </button>
        </div>
      </div>
    </div>
  );
}
