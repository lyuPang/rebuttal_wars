import { useState } from 'react';
import { PAPER_TYPES, type PaperTypeId } from '../game/run';
import { CardFace } from './Card';
import { audio } from '../audio';
import { cardName, paperText, useLang, useT } from '../i18n';

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
  const t = useT();
  const lang = useLang();
  const [selected, setSelected] = useState<PaperTypeId>('theoretical');

  const types = Object.values(PAPER_TYPES);

  return (
    <div className="paper-submission-screen stage-bg">
      <div className="paper-header">
        <h1>{t.submitTitle}</h1>
        <p className="paper-sub">{t.submitSub}</p>
      </div>

      <div className="paper-type-grid">
        {types.map((pt) => {
          const text = paperText(pt.id, lang);
          return (
            <button
              key={pt.id}
              className={`paper-type-card ${selected === pt.id ? 'selected' : ''}`}
              onClick={() => { audio.play('click'); setSelected(pt.id); }}
            >
              <div className="pt-icon">{TYPE_ICONS[pt.id]}</div>
              <div className="pt-name">{text.name}</div>
              <div className="pt-desc">{text.description}</div>
              <div className="pt-card-preview">
                <CardFace cardId={pt.initialCard} small />
              </div>
              <div className="pt-reward">
                {t.startWith} <b>{cardName(pt.initialCard, lang)}</b>
              </div>
              <div className="pt-style">{text.style}</div>
            </button>
          );
        })}
      </div>

      <div className="paper-actions">
        <button className="btn ghost" onClick={onBack}>{t.back}</button>
        <button className="btn primary" onClick={() => { audio.play('click'); onConfirm(selected); }}>
          {t.submitPaper}
        </button>
      </div>
    </div>
  );
}
