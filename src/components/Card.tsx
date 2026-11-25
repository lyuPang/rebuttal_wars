import { CARDS } from '../game/cards';
import { cardText, categoryLabel, useLang, useT } from '../i18n';
import type { CardId } from '../game/types';
import { CardIcon } from './CardIcon';

interface CardFaceProps {
  cardId: CardId;
  cost?: number;
  small?: boolean;
  stamp?: string;
}

export function CardFace({ cardId, cost, small, stamp }: CardFaceProps) {
  const lang = useLang();
  const def = CARDS[cardId];
  const text = cardText(cardId, lang);
  return (
    <div className={`card-face cat-${def.category} ${small ? 'small' : ''}`}>
      <div className="card-top">
        <span className="card-cat">{categoryLabel(def.category, lang)}</span>
        {cost !== undefined && <span className="card-cost">{cost}</span>}
      </div>
      <div className="card-art">
        <CardIcon id={cardId} size={small ? 40 : 56} />
      </div>
      <div className="card-name">{text.name}</div>
      <div className="card-desc">{text.description}</div>
      {!small && <div className="card-flavor">{text.flavor}</div>}
      {stamp && <div className="card-stamp">{stamp}</div>}
    </div>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  const t = useT();
  return (
    <div className={`card-back ${small ? 'small' : ''}`}>
      <div className="card-back-inner">
        <div className="card-back-seal">R#2</div>
        <div className="card-back-text">{t.confidential}</div>
      </div>
    </div>
  );
}
