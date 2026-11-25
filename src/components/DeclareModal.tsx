import { useState } from 'react';
import { CARDS, CATEGORY_LABEL } from '../game/cards';
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
  reviewerHasBurdenOfProof: boolean;
  onConfirm: (declared: CardId) => void;
  onCancel: () => void;
}

export function DeclareModal({ card, player, suspicion, reviewerAp, reviewerHasBurdenOfProof, onConfirm, onCancel }: Props) {
  const claimPool = player.claimPool;
  const defaultDeclared =
    player.ap >= getCost(player, card.cardId, ctx) && claimPool.includes(card.cardId)
      ? card.cardId
      : (claimPool.find((id) => player.ap >= getCost(player, id, ctx)) ?? card.cardId);

  const [declared, setDeclared] = useState<CardId>(defaultDeclared);
  const cost = getCost(player, declared, ctx);
  const affordable = player.ap >= cost;
  const isBluff = declared !== card.cardId;
  const actualCost = getCost(player, card.cardId, ctx);
  const penalty = Math.max(0, actualCost - cost) + DEFAULT_CONFIG.bluffCaughtPenalty;
  const canChallenge = reviewerAp >= 1 || reviewerHasBurdenOfProof;
  const prob = canChallenge ? Math.round(challengeProbability(suspicion) * 100) : 0;

  const byCategory: Record<string, CardId[]> = { attack: [], defense: [], utility: [] };
  for (const id of claimPool) {
    const def = CARDS[id];
    byCategory[def.category].push(id);
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal declare-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Declare this card as...</h2>
        <div className="declare-body">
          <div className="declare-actual">
            <div className="declare-sub">Your actual card</div>
            <CardFace cardId={card.cardId} />
          </div>
          <div className="declare-options">
            {(['attack', 'defense', 'utility'] as const).map((cat) => {
              const ids = byCategory[cat];
              if (ids.length === 0) return null;
              return (
                <div key={cat} className="declare-category-group">
                  <div className="declare-cat-label">{CATEGORY_LABEL[cat]}</div>
                  {ids.map((id) => {
                    const def = CARDS[id];
                    const c = getCost(player, id, ctx);
                    const disabled = player.ap < c;
                    return (
                      <button
                        key={id}
                        className={`declare-opt cat-${def.category} ${declared === id ? 'selected' : ''} ${id === card.cardId ? 'honest' : ''} ${def.isAdvanced ? 'advanced' : ''}`}
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
                            {id === card.cardId && <span className="honest-tag">Honest</span>}
                            {def.isAdvanced && <span className="advanced-tag">Advanced</span>}
                          </div>
                          <div className="opt-desc">
                            {def.description}
                          </div>
                        </div>
                        <div className={`opt-cost ${disabled ? 'no' : ''}`}>{c} AP</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className={`declare-summary ${isBluff ? 'bluff' : 'honest'}`}>
          {isBluff ? (
            <>
              <b>Bluffing!</b> Cost: {cost} AP. Reviewer challenge probability: <b>{prob}%</b>.
              {' '}If caught: extra <b>{penalty} AP</b> penalty, actual card effect resolves.
            </>
          ) : (
            <>
              <b>Honest declaration.</b> Cost: {cost} AP. If challenged ({prob}% chance), reviewer loses 1 AP.
            </>
          )}
          {reviewerHasBurdenOfProof && (
            <span className="burden-warn">
              {' '}Burden of Proof active: the reviewer may challenge even at 0 AP, and a hit grants 2 AP.
            </span>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" disabled={!affordable} onClick={() => onConfirm(declared)}>
            Confirm ({cost} AP)
          </button>
        </div>
      </div>
    </div>
  );
}
