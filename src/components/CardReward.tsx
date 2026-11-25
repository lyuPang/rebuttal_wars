import { useState } from 'react';
import type { CardId } from '../game/types';
import { CardFace } from './Card';
import { audio } from '../audio';
import { useT } from '../i18n';

interface Props {
  cards: CardId[];
  title: string;
  subtitle: string;
  currentClaimPool: CardId[];
  canSkip: boolean;
  onSelect: (cardId: CardId) => void;
  onSkip?: () => void;
}

export function CardReward({ cards, title, subtitle, currentClaimPool, canSkip, onSelect, onSkip }: Props) {
  const t = useT();
  const [selected, setSelected] = useState<CardId | null>(null);

  return (
    <div className="card-reward-screen stage-bg">
      <div className="reward-header">
        <h1>{title}</h1>
        <p className="reward-sub">{subtitle}</p>
      </div>

      <div className="reward-grid">
        {cards.map((id) => {
          const alreadyUnlocked = currentClaimPool.includes(id);
          return (
            <button
              key={id}
              className={`reward-card ${selected === id ? 'selected' : ''}`}
              onClick={() => { audio.play('click'); setSelected(id); }}
            >
              <CardFace cardId={id} />
              <div className="reward-unlock-status">
                {alreadyUnlocked ? t.claimUnlocked : t.claimNew}
              </div>
            </button>
          );
        })}
      </div>

      <div className="reward-actions">
        {canSkip && onSkip && (
          <button className="btn ghost" onClick={() => { audio.play('click'); onSkip(); }}>
            {t.skipReward}
          </button>
        )}
        <button
          className="btn primary"
          disabled={!selected}
          onClick={() => { if (selected) { audio.play('click'); onSelect(selected); } }}
        >
          {t.selectCard}
        </button>
      </div>
    </div>
  );
}
