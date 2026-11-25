import { useEffect, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { HowToPlay } from './components/HowToPlay';
import { GameScreen } from './components/GameScreen';
import { audio } from './audio';
import { ASSETS, type AuthorKind } from './assets';
import { preloadTransparent } from './hooks/useTransparentImage';

type Screen = 'menu' | 'howto' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [author, setAuthor] = useState<AuthorKind>('male');
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    preloadTransparent([ASSETS.authorMale, ASSETS.authorFemale, ASSETS.reviewer]);
  }, []);

  const go = (s: Screen) => {
    audio.play('click');
    if (s === 'game') setGameKey((k) => k + 1);
    setScreen(s);
  };

  const toggleSfx = () => {
    const v = !sfx;
    audio.setSfx(v);
    setSfx(v);
    audio.play('click');
  };
  const toggleMusic = () => {
    const v = !music;
    audio.setMusic(v);
    setMusic(v);
  };

  return (
    <div className="app">
      {screen === 'menu' && (
        <StartScreen
          author={author}
          onAuthor={setAuthor}
          onStart={() => go('game')}
          onHowTo={() => go('howto')}
          sfx={sfx}
          music={music}
          onToggleSfx={toggleSfx}
          onToggleMusic={toggleMusic}
        />
      )}
      {screen === 'howto' && <HowToPlay onBack={() => go('menu')} onStart={() => go('game')} />}
      {screen === 'game' && <GameScreen key={gameKey} author={author} onMenu={() => go('menu')} />}
      <div className="global-toggles">
        <button className={`btn tiny ${sfx ? '' : 'ghost'}`} onClick={toggleSfx} title="音效开关">
          SFX {sfx ? 'ON' : 'OFF'}
        </button>
        <button className={`btn tiny ${music ? '' : 'ghost'}`} onClick={toggleMusic} title="背景音乐开关">
          BGM {music ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
