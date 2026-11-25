import { CARDS, CATEGORY_LABEL } from '../game/cards';
import type { CardId } from '../game/types';
import { CardIcon } from './CardIcon';

interface CardFaceProps {
  cardId: CardId;
  cost?: number;
  small?: boolean;
  stamp?: string;
}

export function CardFace({ cardId, cost, small, stamp }: CardFaceProps) {
  const def = CARDS[cardId];
  return (
    <div className={`card-face cat-${def.category} ${small ? 'small' : ''}`}>
      <div className="card-top">
        <span className="card-cat">{CATEGORY_LABEL[def.category]}</span>
        {cost !== undefined && <span className="card-cost">{cost}</span>}
      </div>
      <div className="card-art">
        <CardIcon id={cardId} size={small ? 40 : 56} />
      </div>
      <div className="card-name">{def.name}</div>
      <div className="card-desc">{def.description}</div>
      {!small && <div className="card-flavor">{def.flavor}</div>}
      {stamp && <div className="card-stamp">{stamp}</div>}
    </div>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  return (
    <div className={`card-back ${small ? 'small' : ''}`}>
      <div className="card-back-inner">
        <div className="card-back-seal">R#2</div>
        <div className="card-back-text">CONFIDENTIAL</div>
      </div>
    </div>
  );
}
