import type { GameOutcome } from '../game/types';
import { getLang, type Lang } from './lang';

const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`;

const en = {
  author: 'Author',
  gameStart: (reviewer: string) => `Paper submitted. ${reviewer} is ready. Rebuttal begins!`,
  turnStart: (round: number, actor: string) => `—— Round ${round}: ${actor}'s turn ——`,
  turnGainAp: (n: number) => `+${n} AP`,
  turnDebtRepaid: (n: number) => `debt repaid ${n}`,
  turnDrew: (n: number) => `drew ${n}`,
  listSep: ', ',
  deltaHp: (n: number) => `HP ${sign(n)}`,
  deltaAp: (n: number) => `AP ${sign(n)}`,
  deltaDebt: (n: number) => `debt ${sign(n)}`,
  deltaShield: (n: number) => `shield ${sign(n)}`,
  deltaLine: (name: string, parts: string[]) => `${name}: ${parts.join(', ')}`,
  shieldAbsorbed: (absorbed: number, target: string, hpLoss: number) =>
    `Shield absorbed ${absorbed}, ${target} lost ${hpLoss} HP`,
  lostHp: (target: string, hpLoss: number, pierce: boolean, bonus: boolean) =>
    `${target} lost ${hpLoss} HP${pierce ? ' (pierce)' : ''}${bonus ? ' (+bonus!)' : ''}`,
  gainedShield: (actor: string, amount: number, permanent: boolean) =>
    `${actor} gained ${amount} ${permanent ? 'permanent' : 'temporary'} shield`,
  drewCards: (actor: string, n: number) => `${actor} drew ${n} card(s)`,
  recoveredAp: (actor: string, gained: number, repaid: number) =>
    `${actor} recovered ${gained} AP${repaid ? ` (debt repaid ${repaid})` : ''}`,
  peeked: (actor: string) => `${actor} peeked at a card`,
  nothingToPeek: 'No cards to peek at',
  gainedCrossCheck: (actor: string) => `${actor} gained 1 Cross-check charge`,
  gainedBurden: (actor: string) => `${actor} gained Burden of Proof`,
  burdenAlready: 'Burden of Proof already active',
  declares: (actor: string, card: string) => `${actor} declares ${card}`,
  accepts: (resp: string) => ` → ${resp} accepts`,
  bluffCaught: (resp: string, actual: string, extra: number) =>
    ` → ${resp} challenges! Bluff caught! (actual: ${actual}, extra: ${extra} AP)`,
  falseAccusation: (resp: string, declared: string) =>
    ` → ${resp} challenges! False accusation! (really was ${declared})`,
  playLine: (head: string, effects: string[], delta: string) =>
    `${head}. Effect: ${effects.join('; ')}${delta ? `. [${delta}]` : ''}`,
  outcome: { accept: 'Accept', weak_accept: 'Weak Accept', reject: 'Reject' } as Record<GameOutcome, string>,
  battleOver: (label: string) => `Battle over: ${label}`,
  endsTurn: (actor: string) => `${actor} ends their turn`,
  deadline: 'Rebuttal Deadline! Comparing HP...',
};

export type LogText = typeof en;

const zh: LogText = {
  author: '作者',
  gameStart: (reviewer) => `论文已提交。${reviewer} 已就位，Rebuttal 开始！`,
  turnStart: (round, actor) => `—— 第 ${round} 轮：${actor} 的回合 ——`,
  turnGainAp: (n) => `+${n} AP`,
  turnDebtRepaid: (n) => `偿还欠额 ${n}`,
  turnDrew: (n) => `抽 ${n} 张`,
  listSep: '，',
  deltaHp: (n) => `HP ${sign(n)}`,
  deltaAp: (n) => `AP ${sign(n)}`,
  deltaDebt: (n) => `欠额 ${sign(n)}`,
  deltaShield: (n) => `护盾 ${sign(n)}`,
  deltaLine: (name, parts) => `${name}：${parts.join('，')}`,
  shieldAbsorbed: (absorbed, target, hpLoss) => `护盾抵挡 ${absorbed} 点，${target} 失去 ${hpLoss} HP`,
  lostHp: (target, hpLoss, pierce, bonus) =>
    `${target} 失去 ${hpLoss} HP${pierce ? '（穿透）' : ''}${bonus ? '（额外伤害！）' : ''}`,
  gainedShield: (actor, amount, permanent) => `${actor} 获得 ${amount} 点${permanent ? '永久' : '临时'}护盾`,
  drewCards: (actor, n) => `${actor} 抽了 ${n} 张牌`,
  recoveredAp: (actor, gained, repaid) => `${actor} 恢复 ${gained} AP${repaid ? `（偿还欠额 ${repaid}）` : ''}`,
  peeked: (actor) => `${actor} 偷看了一张手牌`,
  nothingToPeek: '没有可查看的手牌',
  gainedCrossCheck: (actor) => `${actor} 获得 1 次交叉验证`,
  gainedBurden: (actor) => `${actor} 获得举证责任`,
  burdenAlready: '举证责任已处于激活状态',
  declares: (actor, card) => `${actor} 宣称「${card}」`,
  accepts: (resp) => ` → ${resp} 接受`,
  bluffCaught: (resp, actual, extra) => ` → ${resp} 质疑！谎言被识破！（真实：${actual}，额外 ${extra} AP）`,
  falseAccusation: (resp, declared) => ` → ${resp} 质疑！冤枉好人！（确实是${declared}）`,
  playLine: (head, effects, delta) => `${head}。效果：${effects.join('；')}${delta ? `。[${delta}]` : ''}`,
  outcome: { accept: '接收', weak_accept: '弱接收', reject: '拒稿' },
  battleOver: (label) => `战斗结束：${label}`,
  endsTurn: (actor) => `${actor} 结束回合`,
  deadline: 'Rebuttal 截止！比较剩余 HP……',
};

const LOG: Record<Lang, LogText> = { en, zh };

export function logText(lang: Lang = getLang()): LogText {
  return LOG[lang];
}
