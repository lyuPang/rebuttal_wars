import { useId } from 'react';
import type { CardId } from '../game/types';
import { cardText, useLang } from '../i18n';

interface Props {
  cardId: CardId;
  className?: string;
  children?: React.ReactNode;
}

export function CardNameTooltip({ cardId, className = '', children }: Props) {
  const lang = useLang();
  const tooltipId = useId();
  const text = cardText(cardId, lang);

  return (
    <span
      className={`card-name-tooltip ${className}`}
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      <span>{children ?? text.name}</span>
      <span id={tooltipId} role="tooltip" className="card-tooltip">
        <strong>{text.name}</strong>
        <span>{text.description}</span>
      </span>
    </span>
  );
}
