import { CARD_IDS, ADVANCED_CARD_IDS } from '../game/cards';
import { DEFAULT_CONFIG, REVIEWER1_CONFIG } from '../game/config';
import { CardFace } from './Card';
import { useLang, useT } from '../i18n';

export function HowToPlay({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const c = DEFAULT_CONFIG;
  const t = useT();
  const lang = useLang();
  return (
    <div className="howto stage-bg">
      <div className="howto-panel">
{lang === 'zh' ? (
          <>
        <h1>游戏说明</h1>

        <h2 className="howto-section">会议投稿之旅</h2>
        <ol className="howto-steps">
          <li>
            <b>提交论文。</b>选择一种论文类型，它决定你的初始高级牌，并立即解锁对应的宣称。
          </li>
          <li>
            <b>沿审稿路线前进。</b>审稿人 #1（{REVIEWER1_CONFIG.reviewerHp} HP）→ 卡牌奖励 → 两个随机科研事件 → 审稿人 #2（
            {c.reviewerHp} HP）→ 最终决定。任意一场战斗失败，本次投稿即告结束。
          </li>
          <li>
            <b>扩充牌库。</b>击败审稿人 #1 后恢复 2 HP，并从三张高级牌中选择一张（也可以跳过）。事件也可能给你卡牌或强化下一场战斗。
          </li>
        </ol>

        <h2 className="howto-section">宣称、撒谎、质疑</h2>
        <ol className="howto-steps">
          <li>
            <b>选择一张真实卡牌。</b>点击手牌，这张牌就是你实际要执行的牌。
          </li>
          <li>
            <b>宣称任意已解锁的卡牌。</b>你可以如实宣称，也可以撒谎。费用按<b>宣称的</b>卡牌支付，所以价格不会暴露你的真实手牌。
          </li>
          <li>
            <b>对手选择接受或质疑。</b>
            <ul>
              <li>接受：只执行宣称的效果，只有宣称卡牌的费用上涨。</li>
              <li>谎言被识破：你需补足到真实卡牌费用的差额，外加 1 AP 撒谎惩罚；两张牌的费用都上涨，并执行真实卡牌效果。</li>
              <li>冤枉好人：质疑者失去 1 AP，执行宣称的效果。</li>
            </ul>
          </li>
          <li>
            <b>注意 AP。</b>每回合恢复 {c.apRecoveryPerTurn} AP（上限 {c.maxAp}），抽 {c.drawPerTurn} 张牌（手牌上限{' '}
            {c.handLimit}）。质疑需要 1 AP。如果超支会产生 AP 欠额，下次恢复的 AP 会优先用于还债。
          </li>
        </ol>

        <h2 className="howto-section">同名卡费用递增</h2>
        <p className="howto-note">
          每张卡的费用为 1 AP 加上本回合<b>同名卡</b>已被宣称的次数。打出修订不会再让论点变贵。所有计数在你自己的回合开始时重置。
        </p>

        <h2 className="howto-section">护盾、警惕值与解锁</h2>
        <p className="howto-note">
          临时护盾（蓝色）抵挡普通伤害，在你的回合开始时消失；永久护盾（金色，前人工作）跨回合保留，但不会带到下一场战斗。致命质疑造成穿透伤害，无视两种护盾。审稿人的警惕值决定其质疑概率
          —— 识破你的谎言会升高警惕，冤枉你则会降低。你只能宣称宣称池中的卡牌；获得高级牌时会解锁对应宣称。
        </p>

        <h2 className="howto-section">高级卡牌</h2>
        <p className="howto-note">
          反驳会惩罚本回合已经质疑失败的审稿人。转移视线在你用它撒谎被识破时伤害更高。前人工作提供永久护盾。交叉验证能在你决定是否质疑前，揭示对手下一张真实卡牌的类别。举证责任让你在
          0 AP 时也能质疑一次 —— 失败无代价，成功获得 2 AP。
        </p>

        <h2 className="howto-section">截止时间</h2>
        <p className="howto-note">
          如果 {c.maxRounds} 轮后双方都没有降到 0 HP，则比较剩余 HP：你更高为接收，相同为弱接收，落后则拒稿。审稿人 #2 决定你论文的最终结果。
        </p>

          </>
        ) : (
          <>
        <h1>How to Play</h1>

        <h2 className="howto-section">Conference Run</h2>
        <ol className="howto-steps">
          <li>
            <b>Submit your paper.</b> Pick a Paper Type. It decides the advanced card you start with and the claim it
            unlocks right away.
          </li>
          <li>
            <b>Follow the review route.</b> Reviewer #1 ({REVIEWER1_CONFIG.reviewerHp} HP) → card reward → two random
            research events → Reviewer #2 ({c.reviewerHp} HP) → final decision. Losing any battle ends the run.
          </li>
          <li>
            <b>Grow your deck.</b> After beating Reviewer #1 you heal 2 HP and choose one of three advanced cards, or
            skip it. Events can also hand you cards or buff your next battle.
          </li>
        </ol>

        <h2 className="howto-section">Declare, Bluff, Challenge</h2>
        <ol className="howto-steps">
          <li>
            <b>Choose a real card.</b> Click a card in your hand. That is the card you will actually execute.
          </li>
          <li>
            <b>Declare any unlocked claim.</b> You may call it whatever you like — honest or a bluff. You pay the cost
            of the <b>declared</b> card, so the price never leaks what you really hold.
          </li>
          <li>
            <b>They accept or challenge.</b>
            <ul>
              <li>Accepted: only the declared effect resolves, and only the declared card's cost goes up.</li>
              <li>Bluff caught: you pay the difference up to the real card's cost plus a 1 AP lie penalty, both cards'
                costs go up, and the real card resolves.</li>
              <li>False accusation: the challenger loses 1 AP and the declared effect resolves.</li>
            </ul>
          </li>
          <li>
            <b>Watch your AP.</b> You get {c.apRecoveryPerTurn} AP per turn (max {c.maxAp}) and draw {c.drawPerTurn}{' '}
            cards (hand limit {c.handLimit}). Challenging costs 1 AP. If you overspend you go into AP debt and your next
            recovery pays it back first.
          </li>
        </ol>

        <h2 className="howto-section">Per-Card Cost Escalation</h2>
        <p className="howto-note">
          Each card costs 1 AP plus the number of times <b>that same card</b> was declared for this turn. Playing
          Revision does not make Argument more expensive anymore. All counters reset at the start of your own turn.
        </p>

        <h2 className="howto-section">Shields, Suspicion and Unlocks</h2>
        <p className="howto-note">
          Temporary shields (blue) absorb normal damage and expire at your turn start; permanent shields (gold, Prior
          Work) survive between turns but not between battles. Critical Point deals piercing damage that ignores both.
          The reviewer's suspicion drives its challenge chance — catching your bluff raises it, a false accusation lowers
          it. You can only declare a claim that is in your Claim Pool; advanced claims unlock when you acquire that card.
        </p>

        <h2 className="howto-section">Advanced Cards</h2>
        <p className="howto-note">
          Counterargument punishes a reviewer that already failed a challenge this turn. Red Herring hits harder when
          your bluff on it gets caught. Prior Work grants permanent shield. Cross-check reveals the category of the
          opponent's next real card before you decide to challenge. Burden of Proof lets you challenge once at 0 AP — a
          miss is free, a hit pays 2 AP.
        </p>

        <h2 className="howto-section">Deadline</h2>
        <p className="howto-note">
          If nobody reaches 0 HP after {c.maxRounds} rounds, higher HP wins: Accept, Weak Accept on a tie, Reject if you
          are behind. Reviewer #2 decides the final outcome of your paper.
        </p>

          </>
        )}

        <h2 className="howto-section">{lang === 'zh' ? '卡牌' : 'Cards'}</h2>
        <div className="howto-cards">
          {CARD_IDS.map((id) => (
            <CardFace key={id} cardId={id} small />
          ))}
        </div>
        <div className="howto-badge-row">
          {lang === 'zh'
            ? `${ADVANCED_CARD_IDS.length} 张高级牌可通过奖励和事件解锁。`
            : `${ADVANCED_CARD_IDS.length} advanced cards unlock through rewards and events.`}
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onBack}>
            {t.back}
          </button>
          <button className="btn primary" onClick={onStart}>
            {t.startRun}
          </button>
        </div>
      </div>
    </div>
  );
}
