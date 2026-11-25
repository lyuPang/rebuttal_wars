import type { RunState } from '../game/run';
import { CARDS } from '../game/cards';
import type { CardId } from '../game/types';
import { CardFace } from './Card';

interface Props {
  run: RunState;
  onClose: () => void;
}

export function DeckViewer({ run, onClose }: Props) {
  const deckEntries = Object.entries(run.deck).filter(([, n]) => (n ?? 0) > 0) as [CardId, number][];
  const deckSize = deckEntries.reduce((a, [, n]) => a + n, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal deck-viewer" onClick={(e) => e.stopPropagation()}>
        <h2>Current Deck ({deckSize} cards)</h2>

        <div className="deck-grid">
          {deckEntries.map(([id, n]) => (
            <div key={id} className="deck-entry">
              <CardFace cardId={id} small />
              <div className="deck-count">×{n}</div>
            </div>
          ))}
        </div>

        <h3>Claim Pool ({run.claimPool.length})</h3>
        <div className="claim-summary-list">
          {run.claimPool.map((id) => (
            <span key={id} className={`claim-chip cat-${CARDS[id].category} ${CARDS[id].isAdvanced ? 'advanced' : ''}`}>
              {CARDS[id].name}
            </span>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
