import type { GameState } from '../game/types';

const TEXT = {
  accept: {
    title: 'ACCEPT',
    sub: 'Paper Accepted!',
    lines: [
      'Reviewer #2 将评分从 3 改成了 6，并留言："The authors have addressed most of my concerns."',
      '恭喜！你的论文将被收录。记得在致谢里感谢 Reviewer #2（不要真的感谢）。',
      'Meta-review: "After a heated discussion, the AC recommends acceptance."',
    ],
  },
  weak_accept: {
    title: 'WEAK ACCEPT',
    sub: 'Borderline... but in!',
    lines: [
      'Reviewer #2: "I remain unconvinced, but will not stand in the way."',
      '这就是传说中的 borderline paper。AC 抛了一枚硬币——正面朝上。',
    ],
  },
  reject: {
    title: 'REJECT',
    sub: 'Paper Rejected',
    lines: [
      'Reviewer #2: "The novelty is limited and the experiments are insufficient."',
      '别灰心，下一个会议的 DDL 只剩 3 周了。',
      'Reviewer #2 建议你引用他的 7 篇论文后重新投稿。',
    ],
  },
} as const;

interface Props {
  game: GameState;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function GameOver({ game, onPlayAgain, onMenu }: Props) {
  const result = game.result!;
  const t = TEXT[result.outcome];
  const line = t.lines[game.nextId % t.lines.length];
  const s = game.stats;
  return (
    <div className="modal-backdrop gameover-backdrop">
      <div className={`modal gameover outcome-${result.outcome}`}>
        <div className="stamp">{t.title}</div>
        <h2>{t.sub}</h2>
        <p className="gameover-reason">
          {result.reason === 'deadline' ? 'Rebuttal Deadline 已到，按剩余 HP 决定结果。' : 'HP 归零，讨论提前结束。'}
        </p>
        <p className="gameover-line">{line}</p>
        <div className="stats-grid">
          <div>
            <span>你的剩余 HP</span>
            <b>{game.player.hp}</b>
          </div>
          <div>
            <span>Reviewer 剩余 HP</span>
            <b>{game.reviewer.hp}</b>
          </div>
          <div>
            <span>进行轮次</span>
            <b>{game.round}</b>
          </div>
          <div>
            <span>成功撒谎</span>
            <b>{s.playerSuccessfulBluffs}</b>
          </div>
          <div>
            <span>撒谎被识破</span>
            <b>{s.playerCaughtBluffs}</b>
          </div>
          <div>
            <span>成功质疑</span>
            <b>{s.playerSuccessfulChallenges}</b>
          </div>
          <div>
            <span>错误质疑</span>
            <b>{s.playerWrongChallenges}</b>
          </div>
          <div>
            <span>你打出的卡牌</span>
            <b>{s.playerCardsPlayed}</b>
          </div>
          <div>
            <span>总共打出的卡牌</span>
            <b>{s.playerCardsPlayed + s.reviewerCardsPlayed}</b>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onMenu}>
            主菜单
          </button>
          <button className="btn primary" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
