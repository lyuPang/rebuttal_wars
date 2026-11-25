import type { RunState } from '../game/run';
import { CARDS } from '../game/cards';
import type { CardId } from '../game/types';
import { CardFace } from './Card';
import { cardName, useLang, useT } from '../i18n';

interface Props {
  run: RunState;
  onClose: () => void;
}

export function DeckViewer({ run, onClose }: Props) {
  const t = useT();
  const lang = useLang();
  const deckEntries = Object.entries(run.deck).filter(([, n]) => (n ?? 0) > 0) as [CardId, number][];
  const deckSize = deckEntries.reduce((a, [, n]) => a + n, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal deck-viewer" onClick={(e) => e.stopPropagation()}>
        <h2>{t.currentDeck(deckSize)}</h2>

        <div className="deck-grid">
          {deckEntries.map(([id, n]) => (
            <div key={id} className="deck-entry">
              <CardFace cardId={id} small />
              <div className="deck-count">×{n}</div>
            </div>
          ))}
        </div>

        <h3>{t.claimPool(run.claimPool.length)}</h3>
        <div className="claim-summary-list">
          {run.claimPool.map((id) => (
            <span key={id} className={`claim-chip cat-${CARDS[id].category} ${CARDS[id].isAdvanced ? 'advanced' : ''}`}>
              {cardName(id, lang)}
            </span>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
