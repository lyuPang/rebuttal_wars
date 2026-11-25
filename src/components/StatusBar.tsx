import { DEFAULT_CONFIG } from '../game/config';
import { challengeProbability, totalShield } from '../game/engine';
import type { CharacterState, GameState, Side } from '../game/types';
import { useTransparentImage } from '../hooks/useTransparentImage';

function Hearts({ hp, max }: { hp: number; max: number }) {
  return (
    <div className="hearts" title={`HP ${hp}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={`${i}-${i < hp}`} className={`heart ${i < hp ? 'full' : 'empty'}`} />
      ))}
      <span className="stat-num">{hp}</span>
    </div>
  );
}

function ApPips({ c }: { c: CharacterState }) {
  return (
    <div className="ap-row" title={`AP ${c.ap}/${c.maxAp}${c.apDebt ? `，欠额 ${c.apDebt}` : ''}`}>
      <span className="stat-label">AP</span>
      {Array.from({ length: c.maxAp }, (_, i) => (
        <span key={`${i}-${i < c.ap}`} className={`ap-pip ${i < c.ap ? 'full' : 'empty'}`} />
      ))}
      <span className="stat-num">{c.ap}</span>
      {c.apDebt > 0 && <span className="debt-badge">欠额 -{c.apDebt}</span>}
    </div>
  );
}

function SidePanel({ c, name, img, side, active }: { c: CharacterState; name: string; img: string; side: Side; active: boolean }) {
  const src = useTransparentImage(img);
  const shield = totalShield(c);
  return (
    <div className={`side-panel side-${side} ${active ? 'is-active' : ''}`}>
      <div className="avatar" style={{ backgroundImage: `url(${src})` }} />
      <div className="side-stats">
        <div className="side-name">{name}</div>
        <Hearts hp={c.hp} max={c.maxHp} />
        <ApPips c={c} />
        <div className="mini-row">
          <span className={`shield-badge ${shield > 0 ? 'on' : ''}`} key={`sh-${shield}`}>
            护盾 {shield}
          </span>
          <span className="pile-info">手牌 {c.hand.length} · 牌库 {c.deck.length} · 弃牌 {c.discard.length}</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  game: GameState;
  authorImg: string;
  reviewerImg: string;
}

export function StatusBar({ game, authorImg, reviewerImg }: Props) {
  const prob = Math.round(challengeProbability(game.suspicion, DEFAULT_CONFIG) * 100);
  const turnLabel = game.activeSide === 'player' ? '你的回合' : 'Reviewer #2 的回合';
  return (
    <div className="status-bar">
      <SidePanel c={game.player} name="作者 (You)" img={authorImg} side="player" active={game.activeSide === 'player'} />
      <div className="round-info">
        <div className="round-num">
          Round {game.round} / {DEFAULT_CONFIG.maxRounds}
        </div>
        <div className={`turn-label turn-${game.activeSide}`}>{turnLabel}</div>
        <div className="suspicion" title="Reviewer 的警惕值越高，越可能质疑你的宣称">
          <span className="stat-label">警惕值</span>
          <div className="susp-meter">
            {Array.from({ length: DEFAULT_CONFIG.suspicion.max }, (_, i) => (
              <span key={i} className={`susp-seg ${i < game.suspicion ? 'on' : ''}`} />
            ))}
          </div>
          <span className="susp-val">
            {game.suspicion} · 质疑率 {prob}%
          </span>
        </div>
      </div>
      <SidePanel c={game.reviewer} name="Reviewer #2" img={reviewerImg} side="reviewer" active={game.activeSide === 'reviewer'} />
    </div>
  );
}
