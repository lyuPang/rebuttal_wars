import type { AuthorKind } from '../assets';
import { ASSETS, authorImage } from '../assets';
import { useTransparentImage } from '../hooks/useTransparentImage';
import { audio } from '../audio';

interface Props {
  author: AuthorKind;
  onAuthor: (k: AuthorKind) => void;
  onStart: () => void;
  onHowTo: () => void;
  sfx: boolean;
  music: boolean;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
}

function Portrait({ src, className }: { src: string; className: string }) {
  const t = useTransparentImage(src);
  return <img className={className} src={t} alt="" draggable={false} />;
}

export function StartScreen({ author, onAuthor, onStart, onHowTo, sfx, music, onToggleSfx, onToggleMusic }: Props) {
  return (
    <div className="start-screen stage-bg">
      <div className="title-block">
        <div className="title-small">A Bluffing Card Game of Peer Review</div>
        <h1 className="title">
          REBUTTAL WARS
          <span className="title-sub">Reviewer #2</span>
        </h1>
      </div>
      <div className="start-figures">
        <Portrait src={authorImage(author)} className="start-author" />
        <div className="vs">VS</div>
        <Portrait src={ASSETS.reviewer} className="start-reviewer" />
      </div>
      <div className="author-pick">
        <span>选择你的作者：</span>
        {(['male', 'female'] as AuthorKind[]).map((k) => (
          <button
            key={k}
            className={`btn small ${author === k ? 'primary' : 'ghost'}`}
            onClick={() => {
              audio.play('click');
              onAuthor(k);
            }}
          >
            {k === 'male' ? '作者（男）' : '作者（女）'}
          </button>
        ))}
      </div>
      <div className="start-menu">
        <button className="btn big primary" onClick={onStart}>
          Start Game
        </button>
        <button className="btn big" onClick={onHowTo}>
          How to Play
        </button>
        <div className="toggles">
          <button className={`btn small ${sfx ? '' : 'ghost'}`} onClick={onToggleSfx}>
            音效：{sfx ? '开' : '关'}
          </button>
          <button className={`btn small ${music ? '' : 'ghost'}`} onClick={onToggleMusic}>
            音乐：{music ? '开' : '关'}
          </button>
        </div>
      </div>
    </div>
  );
}
