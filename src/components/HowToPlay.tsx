import { CARD_IDS } from '../game/cards';
import { DEFAULT_CONFIG } from '../game/config';
import { CardFace } from './Card';

export function HowToPlay({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const c = DEFAULT_CONFIG;
  return (
    <div className="howto stage-bg">
      <div className="howto-panel">
        <h1>How to Play</h1>
        <ol className="howto-steps">
          <li>
            <b>选择真实卡牌。</b> 在你的回合点击一张手牌。
          </li>
          <li>
            <b>宣称任意卡牌。</b> 你可以把它说成 7 种卡牌中的任意一种——诚实或者虚张声势都可以。出牌费用按
            <b>宣称的类型</b>计算。
          </li>
          <li>
            <b>接受或质疑。</b> 对方可以 Accept（按宣称效果执行）或 Challenge（翻开真实卡牌）。
            <ul>
              <li>识破谎言：质疑者 +1 AP，撒谎者补交费用差额并额外 -1 AP，执行真实卡牌效果。</li>
              <li>冤枉好人：质疑者 -1 AP，执行宣称效果。</li>
              <li>质疑需要至少 1 AP。AP 不足时扣成「欠额」，之后恢复的 AP 先还债。</li>
            </ul>
          </li>
          <li>
            <b>管理 AP。</b> 每回合恢复 {c.apRecoveryPerTurn} AP（上限 {c.maxAp}），抽 {c.drawPerTurn} 张牌（手牌上限 {c.handLimit}）。
            同一类型（Attack / Defense / Utility）每回合第 n 次使用花费 n AP。记得为质疑对手留点 AP！
          </li>
          <li>
            <b>在 Rebuttal Deadline 前击败 Reviewer #2。</b> 双方 {c.initialHp} HP，先归零者输。{c.maxRounds} 轮后按 HP 判定：
            多于对手 Accept，相同 Weak Accept，少于对手 Reject。
          </li>
        </ol>
        <p className="howto-note">
          护盾只抵挡普通伤害，在拥有者下个回合开始时清零；Critical Point 的穿透伤害无视护盾。Reviewer
          的「警惕值」越高越爱质疑：识破你一次 +2，冤枉你一次 -1。
        </p>
        <div className="howto-cards">
          {CARD_IDS.map((id) => (
            <CardFace key={id} cardId={id} small />
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onBack}>
            返回
          </button>
          <button className="btn primary" onClick={onStart}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
