import { DEFAULT_CONFIG } from '../game/config';
import { challengeProbability, totalTemporaryShield, totalPermanentShield } from '../game/engine';
import type { CharacterState, GameState, Side } from '../game/types';
import { useTransparentImage } from '../hooks/useTransparentImage';
import { reviewerLabel, useLang, useT } from '../i18n';

function Hearts({ hp, max }: { hp: number; max: number }) {
  const t = useT();
  return (
    <div className="hearts" title={t.hpTitle(hp, max)}>
      {Array.from({ length: max }, (_, i) => (
        <span key={`${i}-${i < hp}`} className={`heart ${i < hp ? 'full' : 'empty'}`} />
      ))}
      <span className="stat-num">{hp}</span>
    </div>
  );
}

function ApPips({ c }: { c: CharacterState }) {
  const t = useT();
  return (
    <div className="ap-row" title={t.apTitle(c.ap, c.maxAp, c.apDebt)}>
      <span className="stat-label">AP</span>
      {Array.from({ length: c.maxAp }, (_, i) => (
        <span key={`${i}-${i < c.ap}`} className={`ap-pip ${i < c.ap ? 'full' : 'empty'}`} />
      ))}
      <span className="stat-num">{c.ap}</span>
      {c.apDebt > 0 && <span className="debt-badge">{t.debtBadge(c.apDebt)}</span>}
    </div>
  );
}

function ShieldRow({ c }: { c: CharacterState }) {
  const t = useT();
  const temp = totalTemporaryShield(c);
  const perm = totalPermanentShield(c);
  const total = temp + perm;
  if (total === 0 && !c.crossCheckCharges && !c.burdenOfProofActive) return null;
  return (
    <div className="shield-status-row">
      {temp > 0 && (
        <span className="shield-badge temp-shield" title={t.tempShieldTitle}>
          🛡 {temp}
        </span>
      )}
      {perm > 0 && (
        <span className="shield-badge perm-shield" title={t.permShieldTitle}>
          ⬡ {perm}
        </span>
      )}
      {c.crossCheckCharges > 0 && (
        <span className="crosscheck-badge" title={t.crossCheckTitle(c.crossCheckCharges)}>
          🔍 ×{c.crossCheckCharges}
        </span>
      )}
      {c.burdenOfProofActive && (
        <span className="burden-badge" title={t.burdenTitle}>
          ⚖
        </span>
      )}
    </div>
  );
}

function SidePanel({ c, name, img, side, active }: { c: CharacterState; name: string; img: string; side: Side; active: boolean }) {
  const t = useT();
  const src = useTransparentImage(img);
  return (
    <div className={`side-panel side-${side} ${active ? 'is-active' : ''}`}>
      <div className="avatar" style={{ backgroundImage: `url(${src})` }} />
      <div className="side-stats">
        <div className="side-name">{name}</div>
        <Hearts hp={c.hp} max={c.maxHp} />
        <ApPips c={c} />
        <ShieldRow c={c} />
        <div className="pile-info">{t.piles(c.hand.length, c.deck.length, c.discard.length)}</div>
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
  const t = useT();
  const lang = useLang();
  const rname = reviewerLabel(game.reviewerName, lang);
  const prob = Math.round(challengeProbability(game.suspicion, DEFAULT_CONFIG) * 100);
  const turnLabel = game.activeSide === 'player' ? t.yourTurn : t.reviewerTurn(rname);
  return (
    <div className="status-bar">
      <SidePanel c={game.player} name={t.authorYou} img={authorImg} side="player" active={game.activeSide === 'player'} />
      <div className="round-info">
        <div className="round-num">
          {t.round(game.round, DEFAULT_CONFIG.maxRounds)}
        </div>
        <div className={`turn-label turn-${game.activeSide}`}>{turnLabel}</div>
        <div className="suspicion" title={t.suspicionTitle}>
          <span className="stat-label">{t.suspicion}</span>
          <div className="susp-meter">
            {Array.from({ length: DEFAULT_CONFIG.suspicion.max }, (_, i) => (
              <span key={i} className={`susp-seg ${i < game.suspicion ? 'on' : ''}`} />
            ))}
          </div>
          <span className="susp-val">
            {game.suspicion} · {t.challengeChance(prob)}
          </span>
        </div>
      </div>
      <SidePanel c={game.reviewer} name={rname} img={reviewerImg} side="reviewer" active={game.activeSide === 'reviewer'} />
    </div>
  );
}
