import type { AuthorKind } from '../assets';
import { ASSETS, authorImage } from '../assets';
import { useTransparentImage } from '../hooks/useTransparentImage';
import { audio } from '../audio';
import { setLang, useLang, useT, type Lang } from '../i18n';

interface Props {
  author: AuthorKind;
  onAuthor: (k: AuthorKind) => void;
  onStart: () => void;
  onQuick: () => void;
  onHowTo: () => void;
  sfx: boolean;
  music: boolean;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
}

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
];

function Portrait({ src, className }: { src: string; className: string }) {
  const t = useTransparentImage(src);
  return <img className={className} src={t} alt="" draggable={false} />;
}

export function StartScreen({ author, onAuthor, onStart, onQuick, onHowTo, sfx, music, onToggleSfx, onToggleMusic }: Props) {
  const t = useT();
  const lang = useLang();
  return (
    <div className="start-screen stage-bg">
      <div className="title-block">
        <h1 className="title">
          REBUTTAL WARS
          <span className="title-sub">{t.titleSub}</span>
        </h1>
      </div>
      <div className="start-figures">
        <Portrait src={authorImage(author)} className="start-author" />
        <div className="vs">VS</div>
        <Portrait src={ASSETS.reviewer} className="start-reviewer" />
      </div>
      <div className="start-picks">
      <div className="author-pick lang-pick">
        <span>{lang === 'zh' ? '语言 / Language：' : 'Language / 语言:'}</span>
        {LANG_OPTIONS.map((o) => (
          <button
            key={o.id}
            className={`btn small ${lang === o.id ? 'primary' : 'ghost'}`}
            aria-pressed={lang === o.id}
            onClick={() => {
              audio.play('click');
              setLang(o.id);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="author-pick">
        <span>{t.chooseAuthor}</span>
        {(['male', 'female'] as AuthorKind[]).map((k) => (
          <button
            key={k}
            className={`btn small ${author === k ? 'primary' : 'ghost'}`}
            onClick={() => {
              audio.play('click');
              onAuthor(k);
            }}
          >
            {k === 'male' ? t.authorMale : t.authorFemale}
          </button>
        ))}
      </div>
      </div>
      <div className="start-menu">
        <button className="btn big primary" onClick={onStart}>
          {t.conferenceRun}
        </button>
        <button className="btn big" onClick={onQuick}>
          {t.quickRebuttal}
        </button>
        <button className="btn big" onClick={onHowTo}>
          {t.howToPlay}
        </button>
        <div className="toggles">
          <button className={`btn small ${sfx ? '' : 'ghost'}`} onClick={onToggleSfx}>
            {t.sfx}: {sfx ? t.on : t.off}
          </button>
          <button className={`btn small ${music ? '' : 'ghost'}`} onClick={onToggleMusic}>
            {t.music}: {music ? t.on : t.off}
          </button>
        </div>
      </div>
    </div>
  );
}
