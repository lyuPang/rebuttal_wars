import { RANDOM_EVENTS, type EventId, type EventOption, type RunState } from '../game/run';
import { eventText, useLang, useT } from '../i18n';
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
  const t = useT();
  const lang = useLang();
  const event = RANDOM_EVENTS[eventId];
  const text = eventText(eventId, lang);

  return (
    <div className="random-event-screen stage-bg">
      <div className="event-card">
        <div className="event-icon">{EVENT_ICONS[eventId]}</div>
        <h1 className="event-name">{text.name}</h1>
        <p className="event-desc">{text.description}</p>

        <div className="event-status-bar">
          <span>HP <b>{run.hp}</b> / {run.maxHp}</span>
          <span>{t.deck} <b>{Object.values(run.deck).reduce((a, b) => a + (b ?? 0), 0)}</b></span>
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
                <div className="option-label">{text.options[i].label}</div>
                <div className="option-desc">{text.options[i].description}</div>
                {disabled && <div className="option-disabled-reason">{t.requiresHp}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
