import { RANDOM_EVENTS, type EventId, type EventOption, type RunState } from '../game/run';
import { audio } from '../audio';

interface Props {
  eventId: EventId;
  run: RunState;
  onChoose: (optionIndex: 0 | 1) => void;
}

const EVENT_ICONS: Record<EventId, string> = {
  deadline_extended: '⏰',
  gpu_available: '🖥️',
  critical_bug: '🐛',
  ai_reviewer: '🤖',
  self_citation: '📚',
  missing_baseline: '📈',
  helpful_coauthor: '✉️',
};

export function RandomEventScreen({ eventId, run, onChoose }: Props) {
  const event = RANDOM_EVENTS[eventId];

  return (
    <div className="random-event-screen stage-bg">
      <div className="event-card">
        <div className="event-icon">{EVENT_ICONS[eventId]}</div>
        <h1 className="event-name">{event.name}</h1>
        <p className="event-desc">{event.description}</p>

        <div className="event-status-bar">
          <span>HP <b>{run.hp}</b> / {run.maxHp}</span>
          <span>Deck <b>{Object.values(run.deck).reduce((a, b) => a + (b ?? 0), 0)}</b></span>
        </div>

        <div className="event-options">
          {event.options.map((opt: EventOption, i) => {
            const disabled = opt.disabledWhen ? opt.disabledWhen(run) : false;
            return (
              <button
                key={opt.label}
                className={`event-option ${disabled ? 'disabled' : ''}`}
                disabled={disabled}
                onClick={() => { audio.play('click'); onChoose(i as 0 | 1); }}
              >
                <div className="option-label">{opt.label}</div>
                <div className="option-desc">{opt.description}</div>
                {disabled && <div className="option-disabled-reason">Requires HP &gt; 1</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
