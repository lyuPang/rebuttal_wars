import { useEffect, useRef } from 'react';
import type { HistoryEntry } from '../game/types';

interface Props {
  history: HistoryEntry[];
  open: boolean;
  onClose: () => void;
}

export function ActionLog({ history, open, onClose }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [history.length, open]);
  return (
    <aside className={`action-log ${open ? 'open' : ''}`}>
      <div className="log-header">
        <span>Action Log</span>
        <button className="btn tiny ghost" onClick={onClose}>
          收起
        </button>
      </div>
      <div className="log-body">
        {history.map((h) => (
          <div
            key={h.id}
            className={`log-entry kind-${h.kind} ${h.actorSide ? `actor-${h.actorSide}` : ''} ${
              h.challenged ? (h.challengeCorrect ? 'caught' : 'false-acc') : ''
            }`}
          >
            {h.kind === 'play' && <span className="log-round">R{h.round}</span>}
            {h.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
