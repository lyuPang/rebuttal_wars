import type { RunState, RouteNode } from '../game/run';
import { PAPER_TYPES } from '../game/run';
import { CARDS } from '../game/cards';
import { ADVANCED_CARD_IDS } from '../game/cards';
import { audio } from '../audio';

interface Props {
  run: RunState;
  onEnterNode: (index: number) => void;
  onViewDeck: () => void;
  onMenu: () => void;
}

const NODE_ICONS: Record<string, string> = {
  paper_submission: '📄',
  battle1: '⚔️',
  event: '❓',
  battle2: '💀',
  final_decision: '✉️',
};

const NODE_LABELS: Record<string, string> = {
  paper_submission: 'Submission',
  battle1: 'Reviewer #1',
  event: '???',
  battle2: 'Reviewer #2',
  final_decision: 'Decision',
};

function NodeDisplay({ node, onClick }: { node: RouteNode; onClick: () => void }) {
  const clickable = node.status === 'available';
  return (
    <button
      className={`route-node ${node.status} ${node.type === 'battle2' ? 'boss' : ''}`}
      disabled={!clickable}
      onClick={onClick}
      title={node.status === 'locked' ? 'Locked' : NODE_LABELS[node.type]}
    >
      <span className="node-icon">{NODE_ICONS[node.type]}</span>
      <span className="node-label">{NODE_LABELS[node.type]}</span>
    </button>
  );
}

export function RouteMap({ run, onEnterNode, onViewDeck, onMenu }: Props) {
  const paperType = PAPER_TYPES[run.paperTypeId];
  const advancedCount = run.claimPool.filter((id) => ADVANCED_CARD_IDS.includes(id)).length;
  const deckSize = Object.values(run.deck).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="route-map-screen stage-bg">
      <div className="route-header">
        <h1>Review Route</h1>
        <div className="route-stats">
          <span>
            HP <b>{run.hp}</b> / {run.maxHp}
          </span>
          <span>
            Paper: <b>{paperType.name}</b>
          </span>
          <span>
            Deck <b>{deckSize}</b>
          </span>
          <span>
            Advanced Claims <b>{advancedCount}</b>
          </span>
        </div>
      </div>

      <div className="route-path">
        {run.nodes.map((node, i) => (
          <div key={node.index} className="route-step">
            <NodeDisplay node={node} onClick={() => { audio.play('click'); onEnterNode(node.index); }} />
            {i < run.nodes.length - 1 && <div className={`route-link ${node.status === 'completed' ? 'done' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="route-modifiers">
        {run.pendingBattleModifiers.startingApDelta !== 0 && (
          <span className="mod-badge">Next Battle AP {run.pendingBattleModifiers.startingApDelta > 0 ? '+' : ''}{run.pendingBattleModifiers.startingApDelta}</span>
        )}
        {run.pendingBattleModifiers.startingHandDelta !== 0 && (
          <span className="mod-badge">Next Battle Hand {run.pendingBattleModifiers.startingHandDelta > 0 ? '+' : ''}{run.pendingBattleModifiers.startingHandDelta}</span>
        )}
        {run.pendingBattleModifiers.opponentSuspicionDelta !== 0 && (
          <span className="mod-badge">Next Opponent Suspicion {run.pendingBattleModifiers.opponentSuspicionDelta > 0 ? '+' : ''}{run.pendingBattleModifiers.opponentSuspicionDelta}</span>
        )}
        {run.pendingBattleModifiers.startingCrossCheckCharges !== 0 && (
          <span className="mod-badge">Cross-check ×{run.pendingBattleModifiers.startingCrossCheckCharges}</span>
        )}
      </div>

      <div className="route-claim-summary">
        <div className="claim-summary-title">Claim Pool ({run.claimPool.length})</div>
        <div className="claim-summary-list">
          {run.claimPool.map((id) => (
            <span key={id} className={`claim-chip cat-${CARDS[id].category} ${CARDS[id].isAdvanced ? 'advanced' : ''}`}>
              {CARDS[id].name}
            </span>
          ))}
        </div>
      </div>

      <div className="route-actions">
        <button className="btn ghost" onClick={onMenu}>Main Menu</button>
        <button className="btn" onClick={() => { audio.play('click'); onViewDeck(); }}>View Deck</button>
      </div>
    </div>
  );
}
