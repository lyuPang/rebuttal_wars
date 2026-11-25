import { useState } from 'react';
import { PAPER_TYPES, type PaperTypeId } from '../game/run';
import { CARDS } from '../game/cards';
import { CardFace } from './Card';
import { audio } from '../audio';

interface Props {
  onConfirm: (paperTypeId: PaperTypeId) => void;
  onBack: () => void;
}

const TYPE_ICONS: Record<PaperTypeId, string> = {
  theoretical: '∑',
  empirical: '⚗',
  method: '⚙',
};

export function PaperSubmission({ onConfirm, onBack }: Props) {
  const [selected, setSelected] = useState<PaperTypeId>('theoretical');

  const types = Object.values(PAPER_TYPES);

  return (
    <div className="paper-submission-screen stage-bg">
      <div className="paper-header">
        <h1>Submit Your Paper</h1>
        <p className="paper-sub">Choose your paper type. This determines your starting advanced card and claim ability.</p>
      </div>

      <div className="paper-type-grid">
        {types.map((pt) => {
          const card = CARDS[pt.initialCard];
          return (
            <button
              key={pt.id}
              className={`paper-type-card ${selected === pt.id ? 'selected' : ''}`}
              onClick={() => { audio.play('click'); setSelected(pt.id); }}
            >
              <div className="pt-icon">{TYPE_ICONS[pt.id]}</div>
              <div className="pt-name">{pt.name}</div>
              <div className="pt-desc">{pt.description}</div>
              <div className="pt-card-preview">
                <CardFace cardId={pt.initialCard} small />
              </div>
              <div className="pt-reward">
                Start with: <b>{card.name}</b>
              </div>
              <div className="pt-style">{pt.style}</div>
            </button>
          );
        })}
      </div>

      <div className="paper-actions">
        <button className="btn ghost" onClick={onBack}>Back</button>
        <button className="btn primary" onClick={() => { audio.play('click'); onConfirm(selected); }}>
          Submit Paper
        </button>
      </div>
    </div>
  );
}
