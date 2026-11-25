import type { RunState, RouteNode } from '../game/run';
import { CARDS } from '../game/cards';
import { ADVANCED_CARD_IDS } from '../game/cards';
import { audio } from '../audio';
import { cardName, paperText, useLang, useT } from '../i18n';

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

function NodeDisplay({ node, onClick }: { node: RouteNode; onClick: () => void }) {
  const t = useT();
  const clickable = node.status === 'available';
  return (
    <button
      className={`route-node ${node.status} ${node.type === 'battle2' ? 'boss' : ''}`}
      disabled={!clickable}
      onClick={onClick}
      title={node.status === 'locked' ? t.locked : t.nodeLabels[node.type]}
    >
      <span className="node-icon">{NODE_ICONS[node.type]}</span>
      <span className="node-label">{t.nodeLabels[node.type]}</span>
    </button>
  );
}

export function RouteMap({ run, onEnterNode, onViewDeck, onMenu }: Props) {
  const t = useT();
  const lang = useLang();
  const paperType = paperText(run.paperTypeId, lang);
  const advancedCount = run.claimPool.filter((id) => ADVANCED_CARD_IDS.includes(id)).length;
  const deckSize = Object.values(run.deck).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="route-map-screen stage-bg">
      <div className="route-header">
        <h1>{t.reviewRoute}</h1>
        <div className="route-stats">
          <span>
            HP <b>{run.hp}</b> / {run.maxHp}
          </span>
          <span>
            {t.paper} <b>{paperType.name}</b>
          </span>
          <span>
            {t.deck} <b>{deckSize}</b>
          </span>
          <span>
            {t.advancedClaims} <b>{advancedCount}</b>
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
          <span className="mod-badge">{t.modAp(run.pendingBattleModifiers.startingApDelta)}</span>
        )}
        {run.pendingBattleModifiers.startingHandDelta !== 0 && (
          <span className="mod-badge">{t.modHand(run.pendingBattleModifiers.startingHandDelta)}</span>
        )}
        {run.pendingBattleModifiers.opponentSuspicionDelta !== 0 && (
          <span className="mod-badge">{t.modSuspicion(run.pendingBattleModifiers.opponentSuspicionDelta)}</span>
        )}
        {run.pendingBattleModifiers.startingCrossCheckCharges !== 0 && (
          <span className="mod-badge">{t.modCrossCheck(run.pendingBattleModifiers.startingCrossCheckCharges)}</span>
        )}
      </div>

      <div className="route-claim-summary">
        <div className="claim-summary-title">{t.claimPool(run.claimPool.length)}</div>
        <div className="claim-summary-list">
          {run.claimPool.map((id) => (
            <span key={id} className={`claim-chip cat-${CARDS[id].category} ${CARDS[id].isAdvanced ? 'advanced' : ''}`}>
              {cardName(id, lang)}
            </span>
          ))}
        </div>
      </div>

      <div className="route-actions">
        <button className="btn ghost" onClick={onMenu}>{t.mainMenu}</button>
        <button className="btn" onClick={() => { audio.play('click'); onViewDeck(); }}>{t.viewDeck}</button>
      </div>
    </div>
  );
}
