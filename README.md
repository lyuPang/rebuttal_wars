# Rebuttal Wars: Reviewer #2

网页回合制卡牌游戏（Bluffing Card Game）。你是一名刚投稿的研究者，要在 Rebuttal Deadline 之前通过「出牌 + 宣称 + 质疑」的博弈，先后说服 **Reviewer #1** 与 **Reviewer #2** 接收你的论文。

技术栈：React 18 + TypeScript + Vite。所有规则在浏览器本地运行，无需服务端、无需登录、不调用任何大模型 API。

在线试玩：<https://lyupang.github.io/rebuttal_wars/>

---

## 快速开始

```bash
npm install               # 安装依赖
npm run build:standalone  # 产出单文件 dist-standalone/index.html（双击即玩）
npm run dev               # 本地开发（默认 http://localhost:5173）
npm test                  # 运行全部测试（101 个）
npm run typecheck
npm run build             # 产出多文件静态站点到 dist/
npm run preview           # 预览构建结果
```

`dist-standalone/index.html` 完全自包含（JS、CSS、立绘、BGM 全部内联，约 8.6 MB），可直接双击打开或拷给别人。GitHub Actions（`.github/workflows/deploy.yml`）在推送 `main` 时自动构建该单文件并发布到 GitHub Pages。

## V2 新增内容

| 模块 | 说明 |
|---|---|
| 两种模式 | **Conference Run**（完整流程）与 **Quick Rebuttal**（单场对战 Reviewer #1，带结算浮层） |
| 路线图 | 固定单路线：Paper Submission → Reviewer #1 → ❓ → ❓ → Reviewer #2 → Final Decision；事件节点在进入前不显示内容 |
| Paper Type | Theoretical（Prior Work）/ Empirical（Cross-check）/ Method（Counterargument），各送一张高级牌并解锁对应宣称 |
| 宣称池 | 只能宣称**已解锁**的卡牌；获得新卡即解锁其宣称。Reviewer 同样有自己的宣称池 |
| 高级卡 | Counterargument、Red Herring、Prior Work（永续护盾）、Cross-check（预览对手真实牌类别）、Burden of Proof（0 AP 质疑） |
| 卡牌奖励 | 击败 Reviewer #1 后三选一（可跳过） |
| 随机事件 | 7 个：Rebuttal Deadline Extended、GPU Available at Midnight、A Critical Bug、AI Reviewer、Reviewer Self-Citation、The Missing Baseline、The Helpful Co-author，每个两个选项 |
| 跨战斗继承 | HP、卡组、宣称池、下一场战斗修正（起始 AP/手牌/对手警惕/Cross-check 次数）在 Run 中保留 |
| 双 Reviewer | Reviewer #1：HP 5、起始警惕 3、撒谎率低、偏防守；Reviewer #2：HP 6、起始警惕 2、撒谎率高、偏进攻 |
| BGM | 按场景切换的 6 首原创芯片音乐（菜单 / 地图 / R1 / R2 / Accept / Reject），默认开启，首次交互后播放 |

## 核心规则

| 要点 | 说明 |
|---|---|
| 初始卡组 | 10 张基础牌 + Paper Type 高级牌 = 11 张；起手 4 张，每回合抽 2，手牌上限 6 |
| 出牌 | 打出一张真实卡牌并**宣称**为宣称池内任意一种（可以撒谎） |
| 费用 | 按**同名卡**递增：`基础费用 + 本回合该卡已使用次数`；AP 上限 5，每回合恢复 3 |
| 识破谎言 | `FinalCost = max(宣称费用, 真实费用) + 1`，真实牌与宣称牌的使用次数都 +1，执行真实效果；质疑者 +1 AP |
| 冤枉好人 | 质疑者 -1 AP，执行宣称效果 |
| AP 欠额 | AP 不足时扣到 0，其余记为欠额，之后恢复的 AP 优先还债 |
| 护盾 | 伤害先消耗临时护盾，再消耗 Prior Work 永续护盾；Critical Point 穿透护盾 |
| 结局 | 任一方 HP 归零立即结束；否则轮次上限后按 HP 判定 Accept / Weak Accept / Reject |

## 目录结构

```
src/
  game/                 纯 TypeScript 规则内核（不依赖 React，可单独测试）
    config.ts           可调数值与两套 Reviewer 配置
    reviewers.ts        Reviewer #1 / #2 的名称、牌库与宣称池
    types.ts            GameState / CharacterState / PendingPlay 等数据结构
    cards.ts            7 基础卡 + 5 高级卡定义与牌库构建
    engine.ts           宣称、质疑、费用递增、护盾、AP 债务、回合与胜负
    ai.ts               Reviewer 出牌/撒谎/质疑决策（只读公开信息）
    run.ts              Run 状态机、地图节点、Paper Type、随机事件、奖励与跨战斗继承
    rng.ts              可注入随机数（测试可复现）
  components/           RouteMap、PaperSubmission、CardReward、RandomEvent、RunSummary、
                        DeckViewer、BattleResult、GameScreen、DeclareModal、HowToPlay 等
  audio.ts              分场景 BGM（淡入淡出）+ Web Audio 合成音效
asserts/                像素风角色立绘与 music/ 原创配乐（ogg / mp3）
```

**信息边界**：AI 只能通过 `buildChallengeView()` / `buildReviewerView()` 读取公开信息（宣称、警惕值、HP/AP/护盾、手牌数量），看不到玩家真实牌与手牌内容；真实牌比较只在 `engine.respondToPlay()` 内完成。

## 测试覆盖

`npm test`（101 个测试，5 个文件）：

- **`src/game/engine.v2.test.ts`** —— V2 规则：同名卡费用递增、虚假宣称补费与双计数、5 张高级卡效果、宣称池限制、护盾顺序、两个 Reviewer 配置、100 seed 自动对局无卡死与卡牌守恒、信息不泄漏。
- **`src/game/run.test.ts`** —— Run 流程：地图推进、Paper Type 初始牌、7 个随机事件效果、卡牌奖励、跨战斗继承、战斗结算 → 奖励 → 事件不跳节点的回归测试。
- **`src/ui.test.tsx` / `src/ui.fullgame.test.tsx`** —— jsdom 交互：宣称弹窗只列出已解锁卡、出牌结算、End Turn 交接、脚本自动打完整场战斗。
- **`src/smoke.test.ts`** —— 所有 V2 界面的服务端渲染冒烟。

## 素材来源

- `asserts/*.png`：AI 图像生成的像素风立绘（白底，运行时 canvas 去背）。Reviewer #1 暂复用 `reviewer.png`，通过名牌区分。
- `asserts/music/`：原创程序合成芯片音乐（ChatGPT + Python 程序化合成，无第三方录音或采样），详见 `asserts/music/README.txt`。
- 卡牌图标、卡背与界面装饰均由 SVG / CSS 代码绘制。

## 已知限制（V2）

- 按设计范围不含卡牌升级/删除、商店、遗物、分支路线与存档。
- Reviewer #1 暂无专属立绘。
- 建议 1280×720 及以上窗口。
