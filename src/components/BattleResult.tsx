import { audio } from '../audio';
import type { GameOutcome, GameStats } from '../game/types';
import { useT } from '../i18n';

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
  const tx = useT();
  const t = tx.outcomeBattle[outcome];
  const line = t.lines[(playerHp + rounds) % t.lines.length];

  return (
    <div className="modal-backdrop gameover-backdrop">
      <div className={`modal gameover outcome-${outcome}`}>
        <div className="stamp">{title ?? t.title}</div>
        <h2>{subtitle ?? t.sub}</h2>
        <p className="gameover-line">{line}</p>
        <div className="stats-grid">
          <div>
            <span>{tx.yourHp}</span>
            <b>{playerHp}</b>
          </div>
          <div>
            <span>{tx.rounds}</span>
            <b>{rounds}</b>
          </div>
          <div>
            <span>{tx.successfulBluffs}</span>
            <b>{stats.playerSuccessfulBluffs}</b>
          </div>
          <div>
            <span>{tx.bluffsCaught}</span>
            <b>{stats.playerCaughtBluffs}</b>
          </div>
          <div>
            <span>{tx.successfulChallenges}</span>
            <b>{stats.playerSuccessfulChallenges}</b>
          </div>
          <div>
            <span>{tx.wrongChallenges}</span>
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
            {tx.mainMenu}
          </button>
          <button
            className="btn primary"
            onClick={() => {
              audio.play('click');
              onPlayAgain();
            }}
          >
            {tx.rematch}
          </button>
        </div>
      </div>
    </div>
  );
}
