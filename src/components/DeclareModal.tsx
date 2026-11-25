import { useState } from 'react';
import { CARD_IDS, CARDS, CATEGORY_LABEL } from '../game/cards';
import { DEFAULT_CONFIG } from '../game/config';
import { challengeProbability, getCost, makeContext } from '../game/engine';
import type { CardId, CardInstance, CharacterState } from '../game/types';
import { CardFace } from './Card';
import { CardIcon } from './CardIcon';
import { audio } from '../audio';

const ctx = makeContext();

interface Props {
  card: CardInstance;
  player: CharacterState;
  suspicion: number;
  reviewerAp: number;
  onConfirm: (declared: CardId) => void;
  onCancel: () => void;
}

export function DeclareModal({ card, player, suspicion, reviewerAp, onConfirm, onCancel }: Props) {
  const [declared, setDeclared] = useState<CardId>(
    player.ap >= getCost(player, card.cardId, ctx) ? card.cardId : CARD_IDS.find((id) => player.ap >= getCost(player, id, ctx)) ?? card.cardId,
  );
  const cost = getCost(player, declared, ctx);
  const affordable = player.ap >= cost;
  const isBluff = declared !== card.cardId;
  const actualCost = getCost(player, card.cardId, ctx);
  const penalty = Math.max(0, actualCost - cost) + DEFAULT_CONFIG.bluffCaughtPenalty;
  const prob = reviewerAp >= 1 ? Math.round(challengeProbability(suspicion) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal declare-modal" onClick={(e) => e.stopPropagation()}>
        <h2>宣称这张牌是……</h2>
        <div className="declare-body">
          <div className="declare-actual">
            <div className="declare-sub">你的真实卡牌</div>
            <CardFace cardId={card.cardId} />
          </div>
          <div className="declare-options">
            {CARD_IDS.map((id) => {
              const def = CARDS[id];
              const c = getCost(player, id, ctx);
              const disabled = player.ap < c;
              return (
                <button
                  key={id}
                  className={`declare-opt cat-${def.category} ${declared === id ? 'selected' : ''} ${id === card.cardId ? 'honest' : ''}`}
                  disabled={disabled}
                  onClick={() => {
                    audio.play('click');
                    setDeclared(id);
                  }}
                >
                  <CardIcon id={id} size={28} />
                  <div className="opt-text">
                    <div className="opt-name">
                      {def.name}
                      {id === card.cardId && <span className="honest-tag">如实</span>}
                    </div>
                    <div className="opt-desc">
                      {CATEGORY_LABEL[def.category]} · {def.description}
                    </div>
                  </div>
                  <div className={`opt-cost ${disabled ? 'no' : ''}`}>{c} AP</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className={`declare-summary ${isBluff ? 'bluff' : 'honest'}`}>
          {isBluff ? (
            <>
              <b>虚张声势！</b> 宣称费用 {cost} AP。Reviewer 当前质疑概率 <b>{prob}%</b>。
              若被识破：额外支付 <b>{penalty} AP</b>（不足则记为欠额），并只执行 {CARDS[card.cardId].name} 的效果。
            </>
          ) : (
            <>
              <b>如实宣称。</b> 费用 {cost} AP。若 Reviewer 质疑（概率 {prob}%），他将失去 1 AP 且警惕值下降。
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" disabled={!affordable} onClick={() => onConfirm(declared)}>
            Confirm（{cost} AP）
          </button>
        </div>
      </div>
    </div>
  );
}
