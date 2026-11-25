# Rebuttal Wars: Reviewer #2

网页回合制卡牌游戏（Bluffing Card Game）。你是一名刚投稿的研究者，要在 Rebuttal Deadline 之前通过「出牌 + 宣称 + 质疑」的博弈说服 **Reviewer #2** 接收你的论文。

技术栈：React 18 + TypeScript + Vite。所有规则在浏览器本地运行，无需服务端、无需登录、不调用任何大模型 API。

---

## 快速开始

```bash
npm install           # 安装依赖
npm run build:standalone  # 产出单文件 dist-standalone/index.html（双击即玩）
npm run dev           # 本地开发（默认 http://localhost:5173）
npm test              # 运行核心规则单元测试（24 个）
npm run typecheck
npm run build         # 产出多文件静态站点到 dist/（部署用）
npm run preview       # 预览构建结果
```

### 直接双击打开（不需要起服务）

执行一次 `npm run build:standalone`，产物 `dist-standalone/index.html` 是一个**完全自包含**的文件：JS、CSS、全部角色立绘都已内联进 HTML，没有任何外链。在 Finder 里双击（或直接拖进浏览器）即可开始游戏，也可以单独拷给别人、放进 U 盘或邮件附件发送。

体积约 6.9 MB，主要来自内联的 4 张 PNG 立绘；构建时 `vite.config.ts` 的 `singleFile` 插件会把 JS/CSS 内联并删掉独立产物，图片则通过 `assetsInlineLimit` 转成 base64 data URI。这样绕开了 `file://` 协议下浏览器禁止加载外部 ES module 的限制。

常规 `npm run build` 仍然产出多文件站点（`base: './'`，相对路径），可直接部署到 GitHub Pages / Vercel / 任意静态托管。

## 玩法速览

| 要点 | 说明 |
|---|---|
| 目标 | 双方 5 HP，先被打到 0 的一方失败；6 轮结束按剩余 HP 判定 Accept / Weak Accept / Reject |
| 出牌 | 从手牌选一张真实卡牌，再**宣称**它是 7 种卡牌中的任意一种（可以撒谎） |
| 费用 | 按**宣称类型**计费：`1 + 本回合该类型已使用次数`；AP 上限 5，每回合恢复 3 |
| 回应 | 对手 Accept（按宣称效果执行）或 Challenge（翻开真实牌） |
| 识破谎言 | 质疑者 +1 AP；撒谎者补交 `max(宣称费用, 真实费用)` 差额 + 1 AP 惩罚，执行真实效果 |
| 冤枉好人 | 质疑者 -1 AP，执行宣称效果 |
| AP 欠额 | AP 不足时扣到 0，其余记为欠额，之后恢复的 AP 优先还债（界面可见） |
| 护盾 | 只挡普通伤害，在拥有者下个回合开始时清零；Critical Point 穿透无视护盾 |
| 警惕值 | Reviewer 质疑概率 = `15% + 12% × 警惕值`（0–5）。识破你 +2，冤枉你 -1 |

七种卡牌：Argument（1 普通伤害）、Critical Point（1 穿透伤害）、Evidence（1 护盾）、Strong Evidence（2 护盾）、Additional Experiment（抽 2 张）、Revision（恢复 2 AP）、Investigation（偷看对手 1 张手牌）。

## 目录结构

```
src/
  game/                 纯 TypeScript 规则内核（不依赖 React，可单独测试）
    config.ts           所有可调数值（HP/AP/抽牌/轮次/警惕值/AI 概率/卡牌数值/牌库构成）
    types.ts            GameState / CharacterState / PendingPlay 等数据结构
    cards.ts            七种卡牌定义与牌库构建
    engine.ts           初始化、洗牌抽牌、费用计算、AP 债务、宣称、质疑、结算、回合、胜负
    ai.ts               Reviewer 的出牌/撒谎/质疑/保留 AP 决策（只读公开信息）
    rng.ts              可注入随机数（测试可复现）
    engine.test.ts      Test 1–10 及 20 条边界情况的单元测试
  components/           表现层组件
  hooks/                去白底（把 AI 立绘转成透明 PNG）
  audio.ts              Web Audio 合成音效 + 简单循环 BGM
  styles.css            像素风 UI / 动画
asserts/                AI 生成的像素风角色素材
```

**信息边界**：`ai.ts` 的 `buildChallengeView()` 只拿到「宣称 + 警惕值 + 自己 AP」，看不到玩家待结算的真实牌；`buildReviewerView()` 的对手信息只有 HP / AP / 护盾 / 手牌数量。真实牌与宣称牌的比较只在 `engine.respondToPlay()` 内部完成，公开日志也只在被质疑时才写入真实卡牌。

## 测试覆盖

`npm test`（29 个测试，4 个文件）：

- **`src/game/engine.test.ts`** —— 规则内核：类型费用递增与跨类型独立计数、真实/虚假宣称、跨类型补费（`max(1,3)+1=4`）、Revision 资源循环不会无限滚雪球、护盾（普通/穿透/回合清零）、警惕值增减与 `[0,5]` 夹取、AP=0 无法质疑、隐藏信息不泄漏、HP 归零立即结束、第 6 轮按 HP 判定、抽牌上限与弃牌堆重洗不丢牌、Investigation 对空手牌、重复响应不重复结算、以及 200 局 AI 自动对局无卡死且卡牌守恒。
- **`src/ui.test.tsx`** —— jsdom 交互：选牌 → 宣称 → 结算 → 手牌减少、Action Log 写入；End Turn 后 Reviewer 自动行动并可被响应。
- **`src/ui.fullgame.test.tsx`** —— 由脚本自动打完一整局（约 20 秒），验证不会卡死并最终展示结局界面。
- **`src/smoke.test.ts`** —— 开始界面 / 规则页 / 对战页 / 宣称弹窗 / 结局界面的服务端渲染冒烟。

## 素材来源与 AI 生成记录

`asserts/` 下的角色立绘（作者男/女、Reviewer #2）与三视图表情表由 **AI 图像生成工具**制作（像素风，白色背景），游戏运行时通过 canvas 洪水填充实时移除白底。卡牌图标、卡背、界面临摹装饰均由代码绘制（SVG / CSS），无第三方素材。

| 文件 | 用途 |
|---|---|
| `asserts/author_male.png` / `author_female.png` | 玩家角色立绘（开始界面选择） |
| `asserts/reviewer.png` | Reviewer #2 立绘 |
| `asserts/authors_and_reviewer.png` | 角色三视图/表情设定，用于 How to Play 页面 |

## 已知限制（V1）

- 仅单人 vs 电脑审稿人，无联机、无卡组编辑、无存档。
- 结局界面统计以本局为准；音效为 Web Audio 现场合成，不依赖音频文件。
- 建议 1280×720 及以上窗口，最小约 960×600。
