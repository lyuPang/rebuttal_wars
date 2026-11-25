import { CARD_IDS, ADVANCED_CARD_IDS } from '../game/cards';
import { DEFAULT_CONFIG, REVIEWER1_CONFIG } from '../game/config';
import { CardFace } from './Card';

export function HowToPlay({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const c = DEFAULT_CONFIG;
  return (
    <div className="howto stage-bg">
      <div className="howto-panel">
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

        <h2 className="howto-section">Cards</h2>
        <div className="howto-cards">
          {CARD_IDS.map((id) => (
            <CardFace key={id} cardId={id} small />
          ))}
        </div>
        <div className="howto-badge-row">
          {ADVANCED_CARD_IDS.length} advanced cards unlock through rewards and events.
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn primary" onClick={onStart}>
            Start Run
          </button>
        </div>
      </div>
    </div>
  );
}
