import { CARDS, CATEGORY_LABEL } from '../game/cards';
import { DEFAULT_CONFIG } from '../game/config';
import { PAPER_TYPES, RANDOM_EVENTS, type EventId, type PaperTypeId } from '../game/run';
import type { ReviewerConfig } from '../game/reviewers';
import type { CardId, Category } from '../game/types';
import { getLang, type Lang } from './lang';

interface CardText {
  name: string;
  description: string;
  flavor: string;
}

const v = DEFAULT_CONFIG.cardValues;

const ZH_CARDS: Record<CardId, CardText> = {
  argument: {
    name: '论点',
    description: `造成 ${v.argumentDamage} 点伤害`,
    flavor: '“如表 3 所清楚展示的……”',
  },
  critical_point: {
    name: '致命质疑',
    description: `造成 ${v.criticalDamage} 点穿透伤害（无视护盾）`,
    flavor: '“这直接推翻了你的核心论点。”',
  },
  evidence: {
    name: '证据',
    description: `获得 ${v.evidenceShield} 点护盾`,
    flavor: '“详见补充材料。”',
  },
  strong_evidence: {
    name: '有力证据',
    description: `获得 ${v.strongEvidenceShield} 点护盾`,
    flavor: '“5 个随机种子下 p < 0.001。”',
  },
  additional_experiment: {
    name: '补充实验',
    description: `抽 ${v.experimentDraw} 张牌`,
    flavor: '“我们用 8 张 GPU 跑了一整晚。”',
  },
  revision: {
    name: '修订',
    description: `恢复 ${v.revisionAp} 点 AP`,
    flavor: '“我们已据此修改了第 4 节。”',
  },
  investigation: {
    name: '调查',
    description: `随机查看对手 ${v.investigationPeek} 张手牌`,
    flavor: '“让我看看你的 GitHub 仓库。”',
  },
  counterargument: {
    name: '反驳',
    description: '造成 1 点伤害。若对手本回合已质疑失败过，额外造成 1 点伤害。',
    flavor: '“这与你之前的说法自相矛盾。”',
  },
  red_herring: {
    name: '转移视线',
    description: '造成 1 点伤害。若这是你的真实卡牌且谎言被识破，改为额外造成 1 点伤害。',
    flavor: '“我不是这个意思。”',
  },
  prior_work: {
    name: '前人工作',
    description: '获得 1 点永久护盾。跨回合保留（战斗结束时移除）。',
    flavor: '“正如已有文献所明确证明的……”',
  },
  cross_check: {
    name: '交叉验证',
    description: '获得 1 次交叉验证。在你决定是否质疑前，揭示对手下一张真实卡牌的类别。',
    flavor: '“让我核实一下你的实验设置。”',
  },
  burden_of_proof: {
    name: '举证责任',
    description: '对手下个回合中，可在 0 AP 时质疑一次。质疑失败无代价；成功则获得 2 AP。',
    flavor: '“举证责任在主张者一方。”',
  },
};

const ZH_CATEGORY: Record<Category, string> = {
  attack: '攻击',
  defense: '防御',
  utility: '功能',
};

export function cardText(id: CardId, lang: Lang = getLang()): CardText {
  if (lang === 'zh') return ZH_CARDS[id];
  const def = CARDS[id];
  return { name: def.name, description: def.description, flavor: def.flavor };
}

export function cardName(id: CardId, lang: Lang = getLang()): string {
  return cardText(id, lang).name;
}

export function categoryLabel(cat: Category, lang: Lang = getLang()): string {
  return lang === 'zh' ? ZH_CATEGORY[cat] : CATEGORY_LABEL[cat];
}

interface PaperText {
  name: string;
  description: string;
  style: string;
}

const ZH_PAPERS: Record<PaperTypeId, PaperText> = {
  theoretical: {
    name: '理论论文',
    description: '严谨的理论基础就是你最坚固的防线。',
    style: '永久护盾 · 防御积累 · 长期资源管理',
  },
  empirical: {
    name: '实验论文',
    description: '每一个结论都有大量实验和细致验证作支撑。',
    style: '获取信息 · 识破谎言 · 通过质疑获取 AP',
  },
  method: {
    name: '方法论文',
    description: '新颖的想法值得一场有力的反驳。',
    style: '主动进攻 · 诱导错误质疑 · 把对手失误转化为伤害',
  },
};

export function paperText(id: PaperTypeId, lang: Lang = getLang()): PaperText {
  if (lang === 'zh') return ZH_PAPERS[id];
  const p = PAPER_TYPES[id];
  return { name: p.name, description: p.description, style: p.style };
}

interface EventText {
  name: string;
  description: string;
  options: [{ label: string; description: string }, { label: string; description: string }];
}

const ZH_EVENTS: Record<EventId, EventText> = {
  deadline_extended: {
    name: 'Rebuttal 截止延期',
    description: '由于申请人数过多，rebuttal 截止时间延长了 48 小时。',
    options: [
      { label: '再多跑点实验', description: '下一场战斗：起始手牌 +2' },
      { label: '休息一下', description: '恢复 2 HP' },
    ],
  },
  gpu_available: {
    name: '午夜 GPU 空闲',
    description: '凌晨 2 点，服务器上 8 张 GPU 居然全部空闲。',
    options: [
      { label: '通宵把实验全跑了', description: '失去 1 HP，然后从 3 张随机高级牌中选择 1 张' },
      { label: '让给别人用吧', description: '恢复 1 HP' },
    ],
  },
  critical_bug: {
    name: '致命 Bug',
    description: '等等……为什么训练集和测试集指向的是同一个目录？',
    options: [
      { label: '修好并重跑所有实验', description: '失去 1 HP，获得 1 张交叉验证' },
      { label: '修改论文结论', description: '下一场战斗：起始 AP -1' },
    ],
  },
  ai_reviewer: {
    name: 'AI 审稿人',
    description: '领域主席发现你收到的某份审稿意见完全是由大模型生成的。',
    options: [
      { label: '申请独立复审', description: '下一个对手：警惕值 -2' },
      { label: '要求正式调查', description: '下一场战斗：开局拥有 2 次交叉验证（不加入卡牌）' },
    ],
  },
  self_citation: {
    name: '审稿人自引',
    description: '审稿人强烈建议你引用以下七篇论文。巧的是，它们的第一作者都是同一个人。',
    options: [
      { label: '补上相关引用', description: '获得 1 张前人工作' },
      { label: '解释它们为何无关', description: '获得 1 张反驳' },
    ],
  },
  missing_baseline: {
    name: '缺失的基线',
    description: '你终于复现了 Reviewer #1 建议的基线方法，它的表现出奇地好。',
    options: [
      { label: '进行公平对比', description: '获得 1 张交叉验证' },
      { label: '分析失败案例', description: '获得 1 张转移视线' },
    ],
  },
  helpful_coauthor: {
    name: '靠谱的合作者',
    description: '沉默了三周之后，你的合作者发来一份出乎意料地有用的 rebuttal 草稿。',
    options: [
      { label: '采用他们的草稿', description: '随机获得 1 张高级牌' },
      { label: '剩下的工作交给他们', description: '下一场战斗：起始 AP +2' },
    ],
  },
};

export function eventText(id: EventId, lang: Lang = getLang()): EventText {
  if (lang === 'zh') return ZH_EVENTS[id];
  const ev = RANDOM_EVENTS[id];
  return {
    name: ev.name,
    description: ev.description,
    options: [
      { label: ev.options[0].label, description: ev.options[0].description },
      { label: ev.options[1].label, description: ev.options[1].description },
    ],
  };
}

export function reviewerLabel(name: string, lang: Lang = getLang()): string {
  return lang === 'zh' ? name.replace(/^Reviewer #/, '审稿人 #') : name;
}

const ZH_REVIEWER_LINES: Record<ReviewerConfig['id'], Record<string, string[]>> = {
  reviewer1: {
    argument: ['能否给出更严谨的论证？', '基线需要更新。'],
    critical_point: ['这个结论需要更强的证据。', '我对理论分析并不信服。'],
    evidence: ['正如我在审稿意见中所说……', '请澄清你的问题设定中的假设。'],
    strong_evidence: ['我是这个领域的专家。', '作者应提供更详细的解释。'],
    additional_experiment: ['我需要更多消融实验。', '让我再读一遍附录。'],
    revision: ['我已更新了审稿意见。', '让我再考虑一下……'],
    investigation: ['让我看看你的代码。', 'GitHub 链接在哪？'],
    prior_work: ['参见我 2009 年的论文。', '前人已经做过了。'],
    cross_check: ['我会仔细核实这个说法。', '证据对不上。'],
  },
  reviewer2: {
    argument: ['基线明显过时了。', '第 3 节写得很混乱。'],
    critical_point: ['这是一个致命缺陷。', '核心论点根本站不住脚。'],
    evidence: ['正如我在审稿意见中所说……', '前人已经做过了。'],
    strong_evidence: ['我是这个领域的专家。', '参见我 2009 年的论文。'],
    additional_experiment: ['我需要更多消融实验。', '让我再读一遍附录。'],
    revision: ['我已更新了审稿意见。', '让我再考虑一下……不行。'],
    investigation: ['让我看看你的代码。', 'GitHub 链接在哪？'],
    red_herring: ['创新性明显有限。', '这是一个致命缺陷。'],
    counterargument: ['作者并没有回应我的关切。', '我强烈建议拒稿。'],
  },
};

const ZH_THINK_LINES = ['嗯……', '可疑……', '让我想想。', '真的吗？'];

export function reviewerLines(profile: ReviewerConfig, cardId: CardId, lang: Lang = getLang()): string[] {
  if (lang === 'zh') return ZH_REVIEWER_LINES[profile.id][cardId] ?? ['……'];
  return profile.lines[cardId] ?? ['...'];
}

export function reviewerThinkLines(profile: ReviewerConfig, lang: Lang = getLang()): string[] {
  return lang === 'zh' ? ZH_THINK_LINES : profile.thinkLines;
}
