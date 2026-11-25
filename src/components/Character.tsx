import { useTransparentImage } from '../hooks/useTransparentImage';
import type { Side } from '../game/types';

export type CharStatus = 'idle' | 'attack' | 'defense' | 'damage' | 'block' | 'challenge_success' | 'challenge_fail' | 'think';

export interface FloatText {
  id: number;
  side: Side;
  text: string;
  kind: 'hp' | 'ap' | 'shield' | 'debt' | 'info';
  positive: boolean;
}

interface Props {
  side: Side;
  img: string;
  name: string;
  status: CharStatus;
  shield: number;
  floats: FloatText[];
  speech: string | null;
  active: boolean;
  defeated: boolean;
}

const EMOTE: Partial<Record<CharStatus, string>> = {
  challenge_success: '!',
  challenge_fail: '...',
  damage: '!?',
  think: '?',
};

export function Character({ side, img, name, status, shield, floats, speech, active, defeated }: Props) {
  const src = useTransparentImage(img);
  const emote = EMOTE[status];
  return (
    <div className={`character side-${side} status-${status} ${active ? 'is-active' : ''} ${defeated ? 'defeated' : ''}`}>
      <div className="char-floats">
        {floats.map((f) => (
          <div key={f.id} className={`float-text kind-${f.kind} ${f.positive ? 'pos' : 'neg'}`}>
            {f.text}
          </div>
        ))}
      </div>
      {speech && <div className="speech-bubble">{speech}</div>}
      <div className="char-figure">
        {shield > 0 && (
          <div className="shield-aura">
            <span className="shield-count">{shield}</span>
          </div>
        )}
        {emote && <div className="emote">{emote}</div>}
        <img className="char-img" src={src} alt={name} draggable={false} />
        <div className="char-shadow" />
      </div>
      <div className="podium">
        <div className="podium-plate">{name}</div>
      </div>
    </div>
  );
}
