# Rebuttal Wars: Reviewer #2
# V2.0 游戏设计与增量开发计划书

**项目类型：** 网页回合制 Roguelike 卡牌游戏  
**开发方式：** 基于现有 V1 项目进行增量开发  
**技术方案：** 沿用现有 React + TypeScript + Vite 技术栈  
**游戏模式：** 单人玩家 vs AI Reviewer  
**目标时长：** 每次完整 Run 约 5–10 分钟  
**美术风格：** 2D 像素风格  
**核心玩法：** 卡牌宣称、质疑、行动点管理、有限信息博弈、卡组成长

---

# 1. 开发背景与目标

## 1.1 V1 试玩反馈

目前 V1 已经实现了完整的单场卡牌对战，包括：

- 玩家与 Reviewer 的双向宣称和质疑。
- HP、AP、AP Debt 和护盾系统。
- 卡牌费用递增机制。
- 七种基础卡牌。
- Reviewer AI。
- 像素角色、角色立绘、对话和战斗动画。
- 游戏音效及背景音乐。
- 完整的游戏开始与结束流程。

在第一位测试者的试玩过程中，收到了两个主要反馈：

1. 游戏只有一场战斗，内容量偏少。
2. 背景音乐较为单调，缺少不同游戏阶段之间的变化。

V2 的目标并非简单增加战斗数量，而是通过 Roguelike 元素建立战斗之间的联系，使玩家在一次完整投稿过程中逐渐形成自己的卡组和战斗策略。

## 1.2 V2 核心开发目标

1. 将单场战斗扩展为两场具有不同特点的 Reviewer 战斗。
2. 增加简单的单路线地图。
3. 增加 Paper Type，提供不同的初始卡组和宣称能力。
4. 增加五种与现有宣称、质疑机制具有联动的高级卡牌。
5. 增加七种随机事件。
6. 实现跨战斗的 HP、卡组和宣称池继承。
7. 将同类型 AP 费用递增修改为同名卡牌费用递增。
8. 减少初始基础卡牌数量，提高新增卡牌的实际出现频率。
9. 接入不同游戏阶段的原创背景音乐。
10. 保持原有游戏的视觉风格、幽默感和学术主题。

## 1.3 开发范围限制

V2 暂时不实现：

- 卡牌升级。
- 删除卡牌。
- 商店。
- 货币系统。
- 遗物系统。
- 分支路线。
- 程序化地图生成。
- 局外永久成长。
- 多人联机。
- 复杂的被动天赋树。

不允许为了未来可能增加的功能进行过度设计。

核心数据结构应当具备合理的扩展性，但只实现当前版本需要的功能。

---

# 2. 整体游戏流程

## 2.1 Conference Run

V2 的主要模式为 Conference Run。

完整流程如下：

1. Main Menu
2. Character Selection
3. Paper Submission
4. Route Map
5. Reviewer #1 Battle
6. Card Reward
7. Random Event 1
8. Random Event 2
9. Reviewer #2 Battle
10. Final Decision
11. Run Summary

其中：

- Paper Submission 阶段选择论文类型。
- Reviewer #1 是第一场普通战斗。
- 击败 Reviewer #1 后获得一次三选一卡牌奖励。
- 随后依次经历两个不同的随机事件。
- Reviewer #2 是最终 Boss 战斗。
- 根据最终战斗结果决定论文是否被接收。

如果玩家在任意一场战斗中失败，则立即结束本次 Run，不再进入后续节点。

## 2.2 Quick Rebuttal

建议保留原有单场战斗模式，并命名为 Quick Rebuttal。

该模式主要用于：

- 新玩家快速体验游戏。
- 熟悉宣称与质疑机制。
- 开发阶段测试战斗规则。
- 不希望进行完整 Run 的玩家。

Quick Rebuttal 复用 V2 的战斗引擎，不维护两套不同的 AP 费用和卡牌结算代码。

该模式不包含地图、随机事件和跨战斗成长。

如果保留该模式需要大量修改，则优先保证 Conference Run 完整可玩。

---

# 3. 路线图系统

## 3.1 地图结构

V2 使用固定的单路线地图，不需要随机生成路线。

地图包含以下节点：

| 顺序 | 节点 | 功能 |
|---|---|---|
| 1 | Paper Submission | 选择论文类型 |
| 2 | Reviewer #1 | 第一场战斗 |
| 3 | ? | 随机事件 |
| 4 | ? | 随机事件 |
| 5 | Reviewer #2 | 最终战斗 |
| 6 | Final Decision | 最终投稿结果 |

卡牌奖励作为 Reviewer #1 战斗结束后的独立界面，不需要额外的地图节点。

## 3.2 地图视觉设计

沿用游戏的像素风格。

可以将路线设计为论文审稿流程图，使用虚线或像素化路径连接不同节点。

建议节点图标：

- Paper Submission：论文文档。
- Reviewer #1：普通战斗图标或审稿人头像。
- Random Event：问号。
- Reviewer #2：Boss 战斗图标或审稿人头像。
- Final Decision：会议录用通知。

地图应能够区分：

- 已完成节点。
- 当前可进入节点。
- 尚未解锁节点。

未来节点可以显示位置，但不允许提前点击。

## 3.3 随机事件隐藏

两个随机事件节点在进入前均只显示问号。

不提前展示：

- 事件名称。
- 事件图片。
- 可能获得的卡牌。
- 事件结果。

每次 Run 从事件池中随机抽取两个不同事件。

同一次 Run 不允许重复遇到相同事件。

事件可以在 Run 初始化时确定，也可以在进入节点时随机生成，但不能通过反复切换界面重新抽取。

## 3.4 地图状态栏

路线图上建议始终显示：

- 当前 HP / 最大 HP。
- 已选择的 Paper Type。
- 当前卡组数量。
- 已解锁高级卡牌。
- 当前投稿进度。
- 已获得的下一场战斗增益。

提供 View Deck 按钮，使玩家可以查看当前完整卡组和宣称池。

---

# 4. Run 状态与战斗状态

## 4.1 状态分离

V2 应当明确区分两个层次：

**RunState：**

负责整个投稿过程中的持久状态。

**BattleState：**

负责单场战斗中的临时状态。

不要直接在原有 GameState 中混合全部跨战斗状态和单场战斗状态。

尽量复用现有 Game Engine，通过初始化参数和战斗结算接口与 Run 管理系统连接。

## 4.2 RunState

建议包含：

- `characterId`
- `paperTypeId`
- `hp`
- `maxHp`
- `deck`
- `claimPool`
- `currentNodeIndex`
- `completedNodes`
- `encounteredEventIds`
- `pendingBattleModifiers`
- `battleResults`
- `eventHistory`
- `rewardHistory`
- `runStatistics`
- `finalResult`

Run 中的 Deck 是玩家完整卡组的持久定义。

战斗中的手牌、牌库和弃牌堆应由该完整卡组创建，而不是直接修改 RunState 中的卡组。

## 4.3 跨战斗状态继承

| 属性 | 是否继承 |
|---|---|
| 当前 HP | 是 |
| 最大 HP | 是 |
| 完整卡组 | 是 |
| 宣称池 | 是 |
| Paper Type | 是 |
| AP | 否 |
| AP Debt | 否 |
| 普通护盾 | 否 |
| 永续护盾 | 否 |
| Cross-check 剩余次数 | 否 |
| Burden of Proof 状态 | 否 |
| 当前手牌 | 否 |
| 当前牌库顺序 | 否 |
| 弃牌堆 | 否 |
| 卡牌费用计数 | 否 |
| 随机事件提供的下一场战斗增益 | 是 |

永续护盾的“永续”仅指在当前战斗中跨回合保留，不代表能够跨战斗继承。

## 4.4 战斗胜利后的处理

Reviewer #1 战斗结束后：

- 如果获得 Accept 或 Weak Accept，继续当前 Run。
- 如果获得 Reject，结束当前 Run。
- 胜利后将玩家剩余 HP 保存至 RunState。
- 自动恢复 2 HP，不超过最大 HP。
- 进入卡牌奖励界面。
- 完成奖励选择后返回路线图。

Reviewer #2 战斗结束后：

- 根据该场战斗结果确定最终 Accept、Weak Accept 或 Reject。
- 直接进入 Run Summary。
- 不再发放卡牌奖励。

---

# 5. 初始基础卡组

## 5.1 减少初始牌库

将玩家初始基础卡组从 V1 的 20 张缩减至 10 张。

原因：

由于玩家可以通过宣称使用并未实际抽到的卡牌效果，因此不需要维持传统卡牌游戏中较大的初始卡组。

较小的卡组可以提高新增高级卡牌的抽取概率，使玩家能够明显感受到每次获得新卡所带来的成长。

## 5.2 玩家基础卡组

| 卡牌 | 类型 | 数量 |
|---|---|---:|
| Argument | Attack | 2 |
| Critical Point | Attack | 1 |
| Evidence | Defense | 2 |
| Strong Evidence | Defense | 1 |
| Additional Experiment | Utility | 1 |
| Revision | Utility | 2 |
| Investigation | Utility | 1 |
| 总计 | | 10 |

基础卡牌的效果暂时沿用 V1。

| 卡牌 | 效果 | 基础 AP |
|---|---|---:|
| Argument | 造成 1 点普通伤害 | 1 |
| Critical Point | 造成 1 点穿透伤害 | 1 |
| Evidence | 获得 1 点普通护盾 | 1 |
| Strong Evidence | 获得 2 点普通护盾 | 1 |
| Additional Experiment | 抽取 2 张牌 | 1 |
| Revision | 恢复 2 AP | 1 |
| Investigation | 随机查看对手 1 张手牌 | 1 |

## 5.3 抽牌规则

暂时保留 V1 设置：

- 初始手牌：4 张。
- 自己的新回合开始时抽取 2 张。
- 最大手牌数量：6 张。
- 牌库耗尽时重洗弃牌堆。
- 正在结算的卡牌不得提前进入弃牌堆。
- 不允许在一次抽牌操作中重新抽到仍在结算中的卡牌。

初始牌库将在 Paper Type 选择完成后增加一张高级牌，因此玩家第一场战斗的实际初始卡组为 11 张。

---

# 6. Paper Type 系统

## 6.1 选择流程

在 Paper Submission 阶段，玩家选择自己投稿的论文类型。

不同论文类型提供不同的初始高级卡牌。

V2 不额外实现复杂的被动天赋系统。初始高级牌及其对应宣称能力即为论文类型的初始优势。

## 6.2 三种论文类型

### Theoretical Paper

**理论研究**

描述：

*A rigorous theoretical foundation is your strongest defense.*

初始奖励：

- 获得一张 Prior Work。
- 解锁 Prior Work 宣称。

战斗倾向：

- 永续护盾。
- 防御积累。
- 长期资源管理。

### Empirical Paper

**实验研究**

描述：

*Every claim is backed by extensive experiments and careful verification.*

初始奖励：

- 获得一张 Cross-check。
- 解锁 Cross-check 宣称。

战斗倾向：

- 信息获取。
- 识别虚假宣称。
- 通过质疑获取 AP。

### Method Paper

**方法研究**

描述：

*A novel idea deserves a strong rebuttal.*

初始奖励：

- 获得一张 Counterargument。
- 解锁 Counterargument 宣称。

战斗倾向：

- 主动进攻。
- 诱导错误质疑。
- 将对手的失误转化为伤害。

## 6.3 选择界面

显示三个论文类型选项，每个选项包含：

- Paper Type 名称。
- 对应图标或插图。
- 简短介绍。
- 初始高级卡牌预览。
- 推荐战斗风格。

玩家选择后点击 Submit Paper。

在确认之前可以自由修改选择。

确认后，本次 Run 中不允许更换 Paper Type。

---

# 7. 宣称池系统（Claim Pool）

## 7.1 设计动机

V1 允许玩家将任意手牌宣称为任意一种基础卡牌。

随着高级卡牌增加，如果玩家可以直接宣称所有高级牌，那么战斗奖励和卡组成长将失去意义。

因此 V2 引入独立的 Claim Pool。

## 7.2 基础规则

每个角色具有两个相互独立的卡牌集合：

**Deck：**

决定角色能够实际抽取哪些卡牌。

**Claim Pool：**

决定角色可以将自己的手牌宣称为何种卡牌。

玩家初始 Claim Pool 包含七种基础卡牌。

选择 Paper Type 后，再增加对应的高级卡牌。

## 7.3 获得新卡牌

当玩家通过以下方式获得高级牌时：

- Paper Type。
- 战斗奖励。
- 随机事件。

系统同时执行：

1. 将该卡牌加入 RunState 的完整卡组。
2. 将对应 Card ID 加入 Claim Pool。

如果该 Card ID 已存在于 Claim Pool：

- 卡组中仍增加一张新的真实卡牌实例。
- Claim Pool 不重复添加该选项。

解锁的宣称能力持续整个 Run。

## 7.4 宣称限制

玩家只能宣称当前 Claim Pool 中的卡牌。

例如：

玩家拥有 Argument，但尚未解锁 Red Herring。

则可以将 Argument 宣称为 Critical Point，但不能宣称为 Red Herring。

所有宣称选项还必须满足当前 AP 费用要求。

## 7.5 Reviewer 的宣称池

每个 Reviewer 具有独立的 Claim Pool。

所有 Reviewer 都可以宣称七种基础牌。

高级牌的宣称能力由各自的角色配置决定。

Reviewer 不会因为玩家获得了某种高级牌，就自动获得该牌的宣称能力。

---

# 8. AP 费用递增机制修改

## 8.1 修改目标

V1 中，每次使用卡牌后，相同类型的所有卡牌费用都会增加。

V2 将其改为：

**每次使用某个 Card ID 后，仅增加同名卡牌的费用。**

攻击、防御和功能分类继续保留，但不再用于 AP 递增计数。

## 8.2 费用公式

某张卡牌当前的 AP 费用：

`Cost(card) = BaseCost(card) + UsageCount(card)`

其中：

- `BaseCost` 为该卡牌基础费用。
- `UsageCount` 为该角色本回合中对应 Card ID 已经增加的使用次数。

所有基础牌和高级牌暂时统一采用 1 AP 基础费用。

数据结构应支持未来设置不同的基础费用。

## 8.3 示例

当前玩家拥有两张 Revision 和一张 Investigation。

初始费用：

- Revision：1 AP。
- Revision：1 AP。
- Investigation：1 AP。

第一次使用 Revision 后：

- 剩余 Revision：2 AP。
- Investigation：1 AP。

第一次使用 Investigation 后：

- Revision：2 AP。
- Investigation：2 AP。

使用次数按照 Card ID 记录，而不是实际卡牌实例 ID。

## 8.4 费用重置

每个角色自己的新回合开始时：

- 清除该角色所有卡牌的使用次数。
- 所有卡牌费用恢复基础值。

对手开始回合时，不重置当前角色的费用计数。

## 8.5 宣称费用

出牌时按照宣称牌的费用扣除 AP。

不得按照真实牌的费用直接扣除，否则会泄露真实牌信息。

在出牌前保存：

- `declaredCardId`
- `actualCardId`
- `declaredCostSnapshot`
- `actualCostSnapshot`

两个费用快照必须在更新任何计数前计算。

## 8.6 未被识破

包括以下情况：

- 对手接受宣称。
- 对手质疑失败。

处理方式：

- 只增加宣称牌的使用次数。
- 执行宣称牌效果。
- 不额外增加真实牌的使用次数。

## 8.7 虚假宣称被识破

如果质疑成功：

最终费用为：

`FinalCost = max(DeclaredCost, ActualCost) + 1`

其中额外的 1 AP 是撒谎被识破的惩罚。

处理方式：

1. 已支付的宣称费用不退还。
2. 如果真实牌费用更高，补扣差额。
3. 额外扣除 1 AP。
4. 增加真实牌和宣称牌各自的使用次数。
5. 执行真实牌效果。

AP 不足部分继续使用 V1 的 AP Debt 机制。

## 8.8 Revision 循环限制

Revision 的 AP 收益如下：

| 本回合使用次数 | AP 费用 | 恢复 AP | 净收益 |
|---|---:|---:|---:|
| 第一次 | 1 | 2 | +1 |
| 第二次 | 2 | 2 | 0 |
| 第三次 | 3 | 2 | -1 |
| 第四次 | 4 | 2 | -2 |

Additional Experiment 与 Revision 现在独立计算费用。

虽然这会降低功能牌之间的相互限制，但当前只有 Revision 可以主动恢复 AP，且其重复使用成本不断提高，因此仍然能够限制无限行动。

不增加固定的每回合出牌数量上限。

---

# 9. 五种高级卡牌

所有高级卡牌的基础费用暂时为 1 AP。

高级卡牌遵守与基础卡牌相同的宣称、质疑、费用递增和结算规则。

## 9.1 Counterargument

**类型：** Attack  
**基础费用：** 1 AP

英文描述：

*Deal 1 damage. If your opponent has previously failed a challenge during this turn, deal 1 additional damage.*

效果：

- 造成 1 点普通伤害。
- 如果对手在当前回合此前已经发生过至少一次质疑失败，则改为造成 2 点普通伤害。

详细规则：

- 当前这张 Counterargument 自身引起的质疑失败，不计入其额外伤害条件。
- 必须是本回合之前已完成的质疑失败。
- 无论此前发生多少次质疑失败，额外伤害均为 1。
- 额外伤害为普通伤害，可以被护盾抵挡。
- 回合结束时清除相关计数。

设计目的：

鼓励玩家通过真实宣称诱导对手错误质疑，再利用 Counterargument 发动反击。

## 9.2 Red Herring

**类型：** Attack  
**基础费用：** 1 AP

英文描述：

*Deal 1 damage. If this card is revealed as the actual card after a successful challenge against your bluff, deal 1 additional damage.*

效果：

- 正常结算时造成 1 点普通伤害。
- 如果 Red Herring 是真实打出的卡牌，而玩家将其虚假宣称为其他牌，并被对手成功识破，则造成 2 点普通伤害。

详细规则：

- 如果玩家真实持有 Red Herring 并如实宣称，只造成 1 点伤害。
- 如果玩家将 Red Herring 宣称为 Revision，且对手接受，则只执行 Revision 效果。
- 如果对手成功识破上述虚假宣称，则执行 Red Herring 的强化伤害。
- 玩家仍需要承担虚假宣称被识破的 AP 惩罚。
- 如果玩家使用其他牌虚假宣称 Red Herring 并成功，则只造成 1 点伤害。

设计目的：

允许玩家有意承担被质疑的风险，使虚假宣称在被识破时也可能具有战术收益。

## 9.3 Prior Work

**类型：** Defense  
**基础费用：** 1 AP

英文描述：

*Gain 1 permanent Shield. It persists between turns but is removed at the end of combat.*

效果：

获得 1 点永续护盾。

永续护盾：

- 不会在自己的新回合开始时清除。
- 可以被普通攻击消耗。
- 无法抵挡穿透伤害。
- 不设最大上限。
- 不跨战斗继承。

当角色同时拥有普通护盾和永续护盾时，普通伤害优先消耗普通护盾，再消耗永续护盾。

设计目的：

引入短期防御和长期防御之间的资源规划。

## 9.4 Cross-check

**类型：** Utility  
**基础费用：** 1 AP

英文描述：

*Reveal the category of your opponent's next actual card before deciding whether to challenge.*

效果：

获得一次 Cross-check 侦察机会。

当对手下一次宣称时，在决定是否质疑前，显示对手真实卡牌所属的类型。

例如：

Reviewer declares: Critical Point

Cross-check reveals: Utility

此时玩家能够确定对手进行了跨类型的虚假宣称。

详细规则：

- 只显示 Attack、Defense 或 Utility。
- 不显示真实卡牌的具体名称。
- 在对方完成宣称、尚未决定质疑时触发。
- 无论最终选择 Accept 或 Challenge，均消耗一次侦察机会。
- 多次使用 Cross-check 可以累积侦察次数。
- 每次对手出牌最多消耗一次侦察机会。
- 未使用次数可以跨回合保留，但不跨战斗继承。
- 即使当前没有 AP，侦察效果仍会正常触发并消耗次数。
- AI 使用 Cross-check 时同样遵守这些规则。

设计目的：

将部分质疑行为由随机猜测转化为基于可靠信息的决策。

## 9.5 Burden of Proof

**类型：** Utility  
**基础费用：** 1 AP

英文描述：

*During your opponent's next turn, you may challenge once even with 0 AP. A failed challenge costs nothing; a successful challenge grants 2 AP.*

效果：

获得一次特殊质疑机会。

在对手的下一个回合中：

- 即使当前 AP 为 0，仍然可以发动一次质疑。
- 如果此次质疑失败，不扣除 AP。
- 如果此次质疑成功，获得总计 2 AP，而非普通质疑的 1 AP。

详细规则：

- 特殊质疑机会不可叠加。
- 重复使用该牌不会获得第二次特殊质疑机会。
- 第一次主动质疑时自动消耗该效果，无论成功或失败。
- Accept 不消耗特殊质疑机会。
- 即使发动质疑时仍有 AP，也会优先消耗该特殊效果。
- 如果对手回合结束时尚未使用，则自动失效。
- AP 恢复仍需要优先偿还 AP Debt。
- AP 恢复仍受最大 AP 限制。
- 不跨战斗继承。

Reviewer 可以观察到玩家是否具有该状态。

AI 不得因为玩家 AP 为 0，就错误地认为玩家完全无法质疑。

设计目的：

为质疑流提供新的战术选择，使玩家可以主动耗尽 AP，同时保留一次反制机会。

---

# 10. 新增状态效果系统

为了支持高级卡牌，需要扩展现有角色状态。

建议至少包含：

- `temporaryShield`
- `permanentShield`
- `crossCheckCharges`
- `burdenOfProofActive`
- `failedChallengesThisTurn`

如果 V1 已经存在可扩展的护盾或状态效果结构，应当直接复用，不需要重复实现。

## 10.1 状态显示

在角色状态栏中增加对应图标及数值。

普通护盾和永续护盾应具有不同的颜色或图标。

Cross-check 状态显示剩余侦察次数。

Burden of Proof 状态显示一次特殊质疑机会。

鼠标悬停时显示完整说明。

## 10.2 质疑结算顺序

建议统一为：

1. 验证出牌合法性。
2. 保存当前真实牌和宣称牌费用。
3. 支付宣称费用。
4. 增加宣称牌使用次数。
5. 检查对手是否拥有 Cross-check。
6. 如有侦察机会，显示真实牌类型并消耗一次次数。
7. 检查对手是否可以质疑，包括 Burden of Proof。
8. 对手选择 Accept 或 Challenge。
9. 结算质疑结果。
10. 如使用特殊质疑机会，消耗 Burden of Proof。
11. 结算质疑奖励、惩罚、费用补算及 AP Debt。
12. 结算最终卡牌效果。
13. 更新警惕值及回合统计。
14. 检查胜负。
15. 将真实牌移至弃牌堆。
16. 返回当前行动方的出牌阶段，或结束战斗。

Counterargument 的额外伤害应依据本次宣称开始前的质疑失败记录判断。

Red Herring 的额外伤害应依据当前出牌的实际身份和质疑结果判断。

任何情况下，一次出牌只允许执行一次最终卡牌效果。

---

# 11. Reviewer 系统

## 11.1 总体设计

V2 包含两个不同的 Reviewer：

- Reviewer #1：The Skeptic。
- Reviewer #2：The Aggressor。

两个 Reviewer 应复用同一套 AI 决策框架，但使用不同的配置。

不要为两个角色编写两套完全独立的战斗系统。

## 11.2 Reviewer #1 — The Skeptic

**角色定位：** 严谨、怀疑主义、重视证据。

建议角色形象：

一位表情严肃、戴眼镜的中年女性学者，穿深色学术风格服装。

行为特点：

- 警惕值较高。
- 更倾向质疑玩家。
- 很少主动撒谎。
- 更倾向使用防御牌。
- 更愿意保留 AP。
- 善于利用永续护盾和侦察信息。

示例台词：

- "Could you provide a more rigorous justification?"
- "I am not convinced by the theoretical analysis."
- "This claim requires stronger evidence."
- "Please clarify the assumptions in your formulation."
- "The authors should provide a more detailed explanation."

## 11.3 Reviewer #2 — The Aggressor

**角色定位：** 激进、苛刻、具有压迫感的老学究。

保留 V1 的 Reviewer #2 角色素材和现有台词。

行为特点：

- 更倾向直接攻击。
- 更经常虚假宣称。
- 善于利用玩家无法质疑的时机。
- 更愿意消耗全部 AP。
- 更倾向使用穿透攻击和反驳类卡牌。

保留现有具有学术幽默感的 Reviewer 台词。

可补充：

- "The novelty is clearly limited."
- "This is a fatal flaw."
- "I need more ablations."
- "The baselines are outdated."
- "The authors have not addressed my concerns."
- "I strongly recommend rejection."

## 11.4 Reviewer 参数

以下为初始平衡参数。

| 参数 | Reviewer #1 | Reviewer #2 |
|---|---:|---:|
| HP | 5 | 6 |
| 初始 AP | 3 | 3 |
| 最大 AP | 5 | 5 |
| 每回合恢复 AP | 3 | 3 |
| 初始警惕值 | 3 | 2 |
| 玩家可以质疑时的撒谎倾向 | 15% | 40% |
| 玩家无法质疑时的撒谎倾向 | 40% | 80% |
| 攻击牌价值权重 | 1.0 | 1.5 |
| 防御牌价值权重 | 1.5 | 0.8 |
| 功能牌价值权重 | 1.2 | 1.0 |
| AP 保留倾向 | 高 | 低 |

撒谎倾向是 AI 尝试虚假宣称的概率，而不是强制其每次按照该概率打出任意虚假牌。

AI 仍需判断当前宣称是否具有战术价值。

## 11.5 Reviewer 卡组

Reviewer #1：

| 卡牌 | 数量 |
|---|---:|
| Argument | 1 |
| Critical Point | 1 |
| Evidence | 3 |
| Strong Evidence | 1 |
| Additional Experiment | 1 |
| Revision | 2 |
| Investigation | 1 |
| Prior Work | 1 |
| Cross-check | 1 |
| 总计 | 12 |

Reviewer #2：

| 卡牌 | 数量 |
|---|---:|
| Argument | 3 |
| Critical Point | 2 |
| Evidence | 1 |
| Strong Evidence | 1 |
| Additional Experiment | 1 |
| Revision | 1 |
| Investigation | 1 |
| Red Herring | 1 |
| Counterargument | 1 |
| 总计 | 12 |

两者分别解锁其卡组中包含的高级牌宣称能力。

## 11.6 警惕值与随机质疑

沿用 V1 警惕值系统。

警惕值范围：

- 最低：0。
- 最高：5。

基础质疑概率：

`P(Challenge) = 0.15 + 0.12 × Suspicion`

每次玩家宣称后：

- 如果 Reviewer 无法质疑，则直接 Accept。
- 否则采样一个 [0, 1) 的随机数。
- 随机数小于当前质疑概率时，发动质疑。

警惕值更新：

- 成功识破玩家撒谎：+2。
- 错误质疑真实牌：-1。
- 接受玩家宣称：不变。

限制在 [0, 5]。

## 11.7 AI 对高级牌的使用

Reviewer AI 应具备对新卡牌效果的基本判断能力。

Counterargument：

- 如果玩家本回合此前发生过质疑失败，则提高该牌优先级。

Red Herring：

- 当 AI 实际持有 Red Herring，且玩家具有较高质疑可能性时，可以适当提高虚假宣称该真实牌的倾向。

Prior Work：

- 在战斗前期或预期剩余回合较多时，提高其价值。
- 如果已有大量护盾，则降低继续防御的优先级。

Cross-check：

- 当玩家仍有较多 HP、手牌和潜在行动能力时，提高侦察价值。
- 已有较多侦察次数时降低优先级。

Burden of Proof：

- 通用 AI 应能够识别该牌和状态，以支持未来的 Reviewer 扩展。
- V2 的两个 Reviewer 默认不拥有该牌。

## 11.8 AI 使用侦察信息

AI 必须保持信息公平。

如果 Reviewer 通过 Cross-check 合法获得了玩家真实牌类型，则允许使用该信息。

当真实牌类型与宣称类型不同时：

- AI 可以确定玩家正在撒谎。
- 如果具备质疑资格，则优先直接质疑。

如果类型相同：

- 无法确定真实卡牌身份。
- 继续使用警惕值随机质疑机制。

除此之外，AI 在决定是否质疑前不能读取真实牌的具体 ID。

## 11.9 AP 保留策略

AI 判断玩家能否质疑时，必须使用统一的资格判断函数。

例如：

`CanChallenge = CurrentAP >= 1 OR HasBurdenOfProof`

不能只检查当前 AP。

Reviewer #1 倾向在结束回合时保留至少 1 AP。

Reviewer #2 更愿意为了进攻收益耗尽 AP。

如果存在立即击败玩家的机会，两个 Reviewer 都可以突破各自的 AP 保留倾向。

---

# 12. 战斗奖励系统

## 12.1 奖励触发

当玩家在第一场战斗中获得 Accept 或 Weak Accept 时，进入卡牌奖励界面。

从五种高级牌中随机选择三种不同的卡牌展示。

## 12.2 奖励规则

玩家可以：

- 选择其中一张加入自己的卡组。
- 跳过奖励。

选中的卡牌同时加入 Claim Pool。

允许玩家获得已有的高级牌。

重复获得高级牌可以提高实际抽到该卡牌的概率，而不会增加重复的宣称选项。

## 12.3 奖励池

- Counterargument
- Red Herring
- Prior Work
- Cross-check
- Burden of Proof

三张候选卡牌采用不放回抽样。

奖励界面首次生成后，不允许通过返回、刷新组件或重复进入界面重新抽取候选牌。

## 12.4 奖励界面

建议展示：

- Reviewer #1 的战斗结果。
- 恢复的 HP。
- 三张候选卡牌。
- 卡牌名称、插画、类型和效果。
- 是否已经解锁该宣称。
- Select Card。
- Skip Reward。

选择完成后返回地图。

---

# 13. 随机事件系统

## 13.1 基础机制

V2 共包含七种随机事件。

每次 Run 经历其中两个，且两个事件不能重复。

每个事件具有：

- 唯一 ID。
- 英文名称。
- 事件描述。
- 事件插画或图标。
- 两个选项。
- 明确的选项效果。
- 必要的选择条件。

事件选项的游戏效果应提前告知玩家。

如果包含随机高级卡牌，只需要说明会获得随机高级牌，不必提前公开最终抽取结果。

## 13.2 Event 1 — Rebuttal Deadline Extended

**事件描述：**

*Due to an overwhelming number of requests, the rebuttal deadline has been extended by 48 hours.*

会议官方突然宣布 Rebuttal 截止时间延长两天。

| 选项 | 效果 |
|---|---|
| Run More Experiments | 下一场战斗的初始手牌 +2 |
| Take a Break | 恢复 2 HP |

实现：

- 初始手牌由 4 张增加到 6 张。
- 仍受手牌上限限制。
- HP 恢复不超过最大 HP。

## 13.3 Event 2 — GPU Available at Midnight

**事件描述：**

*It's 2 AM. Somehow, all eight GPUs on the server are available.*

凌晨两点，你发现实验室服务器上的 GPU 居然全部空闲。

| 选项 | 效果 |
|---|---|
| Run Everything Overnight | 损失 1 HP，从三张随机高级牌中选择一张获得 |
| Let Someone Else Have It | 恢复 1 HP |

实现：

- 第一个选项复用三选一卡牌奖励组件。
- 当玩家 HP ≤ 1 时，禁用第一个选项。
- 如果选择第一个选项，扣除 HP 后必须选择一张卡牌，不允许跳过已付出代价的奖励。
- 获得新牌时同步更新 Claim Pool。

## 13.4 Event 3 — A Critical Bug

**事件描述：**

*Wait... why are the training and evaluation datasets pointing to the same directory?*

你突然发现代码存在严重 Bug，之前的实验结果可能并不可靠。

| 选项 | 效果 |
|---|---|
| Fix It and Rerun Everything | 损失 1 HP，获得一张 Cross-check |
| Revise the Conclusions | 下一场战斗初始 AP -1 |

实现：

- 当 HP ≤ 1 时，禁用第一个选项。
- 第二个选项只影响下一场战斗的初始 AP，不影响后续每回合恢复量。
- 获得 Cross-check 时同步解锁该宣称。

该事件属于负面事件，但玩家可以根据自己的卡组和生命状态选择不同代价。

## 13.5 Event 4 — AI Reviewer

**事件描述：**

*The Area Chair has discovered that one of your reviews was entirely generated by an LLM.*

Area Chair 发现一份审稿意见完全由 AI 生成，并决定介入审稿过程。

| 选项 | 效果 |
|---|---|
| Request an Independent Review | 下一位 Reviewer 初始警惕值 -2 |
| Ask for an Official Audit | 下一场战斗开始时获得 2 次 Cross-check 侦察机会 |

实现：

- Reviewer 初始警惕值最低为 0。
- Official Audit 直接增加初始 Cross-check 次数，不向卡组加入 Cross-check 卡牌。
- Official Audit 不会解锁 Cross-check 宣称能力。
- 两次侦察机会按照正常 Cross-check 机制消耗。

## 13.6 Event 5 — Reviewer Self-Citation

**事件描述：**

*The reviewer strongly recommends citing the following seven papers. Coincidentally, they all have the same first author.*

审稿人要求你引用七篇相关论文，而这些论文恰好具有相同的第一作者。

| 选项 | 效果 |
|---|---|
| Add the Relevant Citations | 获得一张 Prior Work |
| Explain Why They Are Irrelevant | 获得一张 Counterargument |

该事件用于提供防御流与进攻流之间的选择。

## 13.7 Event 6 — The Missing Baseline

**事件描述：**

*You finally reproduce the baseline suggested by Reviewer #1. It performs surprisingly well.*

你终于复现了 Reviewer #1 推荐的 Baseline，发现它的效果意外地好。

| 选项 | 效果 |
|---|---|
| Conduct a Fair Comparison | 获得一张 Cross-check |
| Analyze the Failure Cases | 获得一张 Red Herring |

该事件用于提供信息获取与策略性反驳之间的选择。

## 13.8 Event 7 — The Helpful Co-author

**事件描述：**

*After three weeks of silence, your co-author sends you a surprisingly useful rebuttal draft.*

一位沉默了三个星期的合作者，突然发来了一份相当有用的 Rebuttal 草稿。

| 选项 | 效果 |
|---|---|
| Use Their Draft | 获得一张随机高级牌 |
| Let Them Handle the Remaining Work | 下一场战斗初始 AP +2 |

实现：

- 随机高级牌从五种高级牌中抽取。
- 允许获得重复牌。
- 初始 AP 不超过最大 AP。

## 13.9 事件增益叠加

使用统一的下一场战斗增益结构。

建议包含：

- `startingApDelta`
- `startingHandDelta`
- `opponentSuspicionDelta`
- `startingCrossCheckCharges`

多个事件对同一属性的增益可以累加。

例如：

第一个事件使初始 AP -1，第二个事件使初始 AP +2。

最终下一场战斗初始 AP 为：

`clamp(3 - 1 + 2, 0, 5) = 4`

所有增益在下一场战斗初始化时统一应用。

应用后从 RunState 中清除，防止重复触发。

## 13.10 事件界面

事件页面包含：

- 事件名称。
- 像素风插画或图标。
- 事件描述。
- 两个选择按钮。
- 每个选择的具体效果。
- 当前 HP 和相关卡组信息。

选择完成后展示结果反馈，例如：

- HP -1。
- New Card Acquired。
- New Claim Unlocked。
- Next Battle: Starting AP +2。

同一个事件只能结算一次。

---

# 14. 战斗基础参数与初始化

## 14.1 玩家参数

暂时沿用：

| 属性 | 数值 |
|---|---:|
| 最大 HP | 5 |
| 初始 Run HP | 5 |
| 每场战斗基础初始 AP | 3 |
| 最大 AP | 5 |
| 每回合恢复 AP | 3 |
| 基础初始手牌 | 4 |
| 每回合抽牌 | 2 |
| 最大手牌 | 6 |
| 最大战斗轮次 | 6 |

普通护盾和永续护盾均无上限。

## 14.2 战斗初始化流程

开始任意一场战斗时：

1. 读取当前 RunState。
2. 根据玩家持久卡组创建独立的战斗牌库。
3. 读取当前 HP 和最大 HP。
4. 初始化 AP 和 AP Debt。
5. 清空全部战斗临时状态。
6. 根据当前 Reviewer 配置初始化对手。
7. 应用下一场战斗事件增益。
8. 分别洗牌。
9. 抽取初始手牌。
10. 清除已消耗的事件增益。
11. 开始第一轮玩家回合。

玩家先手。

第一轮双方不再额外进行回合开始的 AP 恢复和抽牌。

如果 Reviewer 在玩家第一回合中通过质疑改变了 AP，则其第一次正式行动时保留改变后的 AP，而不是重置成 3。

## 14.3 战斗结束

任意一方 HP 降至 0，立即结束当前战斗。

若六个完整轮次结束后双方仍存活：

- 玩家 HP 更高：Accept。
- 双方 HP 相同：Weak Accept。
- 玩家 HP 更低：Reject。

两个 Reviewer 暂时使用相同的最大轮次设置。

## 14.4 平衡性注意事项

同名卡牌费用递增降低了不同攻击牌之间的相互限制。

例如：

玩家连续使用 Argument、Critical Point 和 Counterargument，首次使用每种牌均只需要 1 AP。

这可能导致单回合爆发伤害明显提高。

V2 初期暂时不修改基础伤害和玩家 HP，但必须进行实测。

如果出现大量一至两个回合结束的战斗，可考虑：

- 将玩家及 Reviewer 的 HP 提高至 6–8。
- 提高部分强力卡牌的基础费用。
- 调整 AI 的进攻权重。
- 调整初始高级牌配置。

开发 Agent 不应在未测试的情况下擅自改变全部平衡参数。

---

# 15. 音乐与音频系统

## 15.1 原创音乐素材

使用已提供的位于 asserts/music 目录下的音乐文件。

其中包含六首原创音乐，提供 OGG 和 MP3 两种格式。

优先使用 OGG，MP3 作为兼容性备用格式。

## 15.2 音乐配置

| 游戏阶段 | 音乐 | 文件名 |
|---|---|---|
| 主菜单、角色选择、Paper Submission | Paper Submission | 01_paper_submission |
| 路线图、随机事件、卡牌奖励 | Midnight Lab | 02_midnight_lab |
| Reviewer #1 战斗 | Cross-examination | 03_reviewer_1_cross_examination |
| Reviewer #2 战斗 | Final Rebuttal | 04_reviewer_2_final_rebuttal |
| Accept、Weak Accept | Paper Accepted! | 05_paper_accepted |
| Reject | Paper Rejected | 06_paper_rejected |

前四首音乐循环播放。

最后两首音乐单次播放。

Quick Rebuttal 根据所选择的 Reviewer 使用对应的战斗音乐。

## 15.3 音乐切换

不同场景进入时自动选择对应音乐。

例如：

- 从主菜单进入 Paper Submission：继续当前音乐。
- 从地图进入 Reviewer #1 战斗：切换至 Cross-examination。
- 从战斗进入卡牌奖励：切换至 Midnight Lab。
- 在地图、随机事件和卡牌奖励之间切换：继续 Midnight Lab，不重新播放。
- 进入最终 Boss 战：切换至 Final Rebuttal。
- 进入最终结局：播放对应结局音乐一次。

Reviewer #1 胜利后可以播放一次简短的胜利音乐，再恢复 Midnight Lab。

不强制玩家等待音乐播放完毕才能继续操作。

## 15.4 音乐播放要求

- 不同背景音乐之间采用约 0.6 秒的交叉淡入淡出。
- 相同音乐对应的场景切换不重置播放进度。
- BGM 默认音量设为 30%。
- 保留现有战斗 SFX。
- BGM 与 SFX 应可独立调整音量。
- 保留静音功能。
- 浏览器音频播放失败时，不影响游戏逻辑。
- 遵守浏览器自动播放限制，在首次用户交互后启动音乐。
- 切换场景时不能遗留多个持续播放的音轨。
- 重新开始游戏时正确清理上一局音频状态。

建议实现统一的 AudioManager，而不是在每个界面组件中创建独立的音频播放器。

---

# 16. UI 与视觉表现

## 16.1 视觉风格

继续沿用 V1 的：

- 2D 像素风。
- 作者男女角色素材。
- Reviewer #2 角色素材。
- 对话立绘。
- 战斗角色 Sprite。
- 卡牌布局。
- HP 和 AP 显示。
- 翻牌及攻击动画。
- 学术主题对话。

不对现有战斗界面进行无必要的重新设计。

新增界面应与 V1 在颜色、字体、边框和按钮风格上保持一致。

## 16.2 新增素材

V2 建议新增：

1. Reviewer #1 像素角色。
2. Reviewer #1 对话立绘。
3. 三种 Paper Type 图标。
4. 五种高级卡牌插画或图标。
5. 路线图节点图标。
6. 七种随机事件的插画或图标。

初期可以使用占位图标完成逻辑。

随机事件插画可以后续逐步替换，不得因为缺少美术素材而阻塞核心功能开发。

## 16.3 卡牌宣称界面

由于 Claim Pool 动态扩展，原有固定七种卡牌选项的宣称界面需要修改。

要求：

- 只显示当前已解锁的宣称选项。
- 显示每种卡牌当前费用。
- 高级牌具有明显的视觉区别。
- 保留 Attack、Defense 和 Utility 分类。
- 当前 AP 不足的选项不可点击。
- 卡牌数量增加时支持自适应布局或滚动。
- 不允许新增卡牌遮挡确认、取消等操作按钮。

建议默认按照卡牌类型分组。

## 16.4 侦察信息反馈

Cross-check 触发时，需要在对方宣称区域显示明确提示。

例如：

**CROSS-CHECK**

*Actual card category: Utility*

如果真实类型与宣称类型不同，可以通过颜色、图标或文字强调发现矛盾，但不能直接显示真实牌名。

Burden of Proof 生效时：

- 显示特殊状态图标。
- AP 为 0 时，Challenge 按钮仍可使用。
- 按钮旁显示 Free Challenge 或 Special Challenge。
- 特殊质疑成功时明确显示 +2 AP。

## 16.5 永续护盾显示

普通护盾与永续护盾应分别显示。

例如：

- Temporary Shield：蓝色。
- Permanent Shield：金色或紫色。

需要让玩家能够理解为什么回合开始后某些护盾没有消失。

## 16.6 情境对话

继续保留 V1 的学术幽默台词。

新增台词可以根据以下事件触发：

- 使用 Counterargument。
- Red Herring 被识破。
- Cross-check 发现类型矛盾。
- Burden of Proof 成功质疑。
- Reviewer HP 较低。
- 最后一轮。
- Reviewer 无法继续行动。
- 战斗胜利和失败。

示例：

- "This contradicts your previous claim."
- "That is not what I meant."
- "As clearly stated in the supplementary material..."
- "I appreciate the clarification. However, my main concern remains."
- "I have decided to raise my score."
- "I will leave the final decision to the Area Chair."

情境台词只用于反馈，不应改变游戏规则或泄露未公开的真实牌信息。

## 16.7 语言

建议新增界面和规则说明使用英文，以方便不同语言背景的同学与老师游玩。

如果现有项目已经支持语言切换，应沿用其实现。

不强制为 V2 新建完整的国际化框架，但不能使关键操作提示和卡牌描述出现明显的语言不一致。

---

# 17. Run Summary

完成一次 Run 后，显示最终投稿结果及本次游戏统计。

## 17.1 最终结果

- Accept。
- Weak Accept。
- Reject。

根据 Reviewer #2 战斗结果确定最终结果。

如果在 Reviewer #1 阶段失败，则直接显示 Reject。

## 17.2 统计信息

建议展示：

- 所选角色。
- 所选 Paper Type。
- 已击败 Reviewer 数量。
- 最终剩余 HP。
- 总游戏时长。
- 总战斗轮次。
- 成功虚假宣称次数。
- 虚假宣称被识破次数。
- 成功质疑次数。
- 错误质疑次数。
- 本次获得的高级卡牌。
- 最终卡组。
- 经历的随机事件及所选选项。

复用现有的对局统计系统，不重复维护不必要的统计数据。

## 17.3 操作

- Play Again：开始新的 Conference Run。
- Main Menu：返回主菜单。
- View Final Deck：查看最终卡组。

开始新 Run 时，必须清除上一局的全部持久状态和临时状态。

---

# 18. 技术架构与增量开发要求

## 18.1 总体原则

必须基于现有 V1 项目进行开发。

在修改代码之前：

1. 阅读现有目录结构。
2. 理解现有 Game Engine。
3. 理解卡牌效果注册机制。
4. 理解 AI 决策逻辑。
5. 理解音频管理方式。
6. 确认现有构建和测试流程。

以下建议模块名称仅用于说明职责。

如果现有项目已存在对应模块，应直接扩展，不要求为了符合文档名称而移动或重写文件。

## 18.2 建议新增或扩展的模块

**Game Engine**

- 同名卡牌费用计数。
- 高级卡牌效果。
- 新增状态效果。
- 战斗初始化参数。
- 战斗结束回调。

**Card Registry**

- 基础卡牌配置。
- 高级卡牌配置。
- Claim Pool。
- 卡牌效果和基础费用。

**Run Manager**

- Run 初始化。
- Paper Type 选择。
- 路线节点推进。
- 跨战斗状态继承。
- 卡牌奖励。
- 随机事件。
- 最终结局。

**Reviewer Configuration**

- Reviewer #1 参数和卡组。
- Reviewer #2 参数和卡组。
- AI 权重。
- 角色素材及台词。

**Event Registry**

- 七种事件配置。
- 事件描述。
- 选项条件。
- 选项效果。

**Audio Manager**

- 音乐场景映射。
- 循环播放。
- Crossfade。
- BGM 和 SFX 音量。
- 音频资源清理。

## 18.3 游戏场景

建议在现有应用状态基础上增加：

- `main_menu`
- `character_selection`
- `paper_submission`
- `route_map`
- `battle`
- `card_reward`
- `random_event`
- `run_summary`

战斗内部继续使用现有的回合状态机。

应用场景状态和战斗内部状态应分离。

## 18.4 卡牌与事件配置化

高级牌和随机事件尽量通过统一配置实现。

例如，事件效果可抽象为：

- `heal`
- `loseHp`
- `addCard`
- `addRandomAdvancedCard`
- `chooseAdvancedCard`
- `modifyNextBattleAp`
- `modifyNextBattleHand`
- `modifyOpponentSuspicion`
- `grantCrossCheckCharges`

不要为七个事件分别编写七套完全不同的界面和状态管理逻辑。

## 18.5 随机性与测试

随机数调用尽量支持注入可控 RNG，或沿用现有可测试的随机数接口。

主要随机行为：

- 洗牌。
- Reviewer 是否质疑。
- Reviewer 是否撒谎。
- 随机事件抽取。
- 奖励卡牌抽取。
- Investigation。

自动化测试中应可以固定随机种子或指定随机结果。

## 18.6 兼容性

继续支持现有浏览器构建方式。

确保：

- 无需后端。
- 无需调用外部 AI API。
- 无需用户登录。
- 所有音乐和美术素材随构建一起发布。
- 静态网页部署正常。
- 如果 V1 支持独立 HTML 构建，应尽量继续支持。

如果 OGG 和 MP3 两套音频同时被打包导致独立 HTML 体积明显增加，可以为不同构建目标选择适当的音频格式。

---

# 19. 开发顺序

## Phase 0 — 保留 V1

- 保存现有可运行版本。
- 创建 V2 开发分支或独立版本。
- 运行现有测试。
- 确认现有游戏可以正常运行。

## Phase 1 — 战斗机制修改

优先完成：

1. 同名卡牌 AP 费用递增。
2. 初始基础卡组缩减为 10 张。
3. Claim Pool。
4. 五种高级卡牌。
5. 永续护盾。
6. Cross-check。
7. Burden of Proof。
8. 新增卡牌与原有宣称机制的兼容。

暂时在现有单场对战中测试全部新机制。

此阶段不需要实现路线图。

## Phase 2 — Reviewer 扩展

- 增加 Reviewer #1。
- 将 Reviewer 配置与 AI 逻辑分离。
- 为两个 Reviewer 设置独立卡组。
- 实现不同的进攻、防御、撒谎和 AP 保留倾向。
- 测试高级卡牌的 AI 使用。

## Phase 3 — Run 系统

- 实现 RunState。
- 实现 Paper Type。
- 实现固定单路线地图。
- 实现两场战斗之间的状态继承。
- 实现三选一卡牌奖励。
- 实现完整 Run 的结束条件。

完成此阶段后，游戏应当已经可以从 Paper Submission 游玩至 Final Decision。

## Phase 4 — 随机事件

- 实现统一事件组件。
- 实现事件效果处理器。
- 增加七种事件配置。
- 实现两个问号节点。
- 实现不重复抽取。
- 实现下一场战斗增益叠加与消耗。

## Phase 5 — 音乐与视觉

- 接入六首原创音乐。
- 完成音乐切换与音量控制。
- 加入 Reviewer #1 角色素材。
- 加入高级牌图标。
- 完善路线图和事件视觉效果。
- 增加情境台词。

## Phase 6 — 平衡测试与发布

- 进行完整 Run 测试。
- 测试不同 Paper Type。
- 检查随机事件组合。
- 调整必要的平衡参数。
- 检查浏览器兼容性。
- 生成新的游戏构建。
- 更新 README 和 How to Play。

每个 Phase 完成后均应确保项目处于可运行状态。

---

# 20. 自动化测试与验收要求

除保留 V1 原有测试外，至少增加以下测试。

## Test 1 — 同名费用递增

使用 Revision 后：

- 其他 Revision 费用增加。
- Investigation 和 Additional Experiment 费用不变。
- 新回合开始后全部费用重置。

## Test 2 — 虚假宣称费用

实际牌费用为 3 AP，宣称牌费用为 1 AP。

质疑成功后：

- 总费用为 4 AP。
- 真实牌和宣称牌的计数均增加。
- 实际效果正确执行。
- AP 不足部分产生 AP Debt。

## Test 3 — 资源循环

当对手 AP 为 0 时，反复尝试将手牌宣称为 Revision 和 Additional Experiment。

确认：

- 不存在无限 AP。
- 不存在无限抽牌。
- 不存在无限行动。
- 不需要固定出牌次数上限。

## Test 4 — Claim Pool

玩家初始无法宣称尚未解锁的高级牌。

选择 Paper Type 或获得奖励后：

- 卡组增加一张牌。
- 对应宣称解锁。
- 重复获得该牌不会产生重复宣称选项。

## Test 5 — Counterargument

分别测试：

- 对手此前没有质疑失败：1 伤害。
- 对手此前质疑失败：2 伤害。
- 对手仅在当前 Counterargument 出牌时质疑失败：1 伤害。
- 额外伤害可以被护盾抵挡。

## Test 6 — Red Herring

分别测试：

- 真实宣称：1 伤害。
- 虚假宣称为其他牌且被识破：2 伤害。
- 虚假宣称为其他牌且被接受：只执行宣称牌效果。
- 其他牌虚假宣称为 Red Herring 并成功：1 伤害。

## Test 7 — 永续护盾

验证：

- 普通攻击优先消耗临时护盾。
- 普通护盾在己方新回合开始时清空。
- 永续护盾不会在新回合开始时消失。
- 穿透伤害不消耗两种护盾。
- 两种护盾均不跨战斗继承。

## Test 8 — Cross-check

验证：

- 只显示真实牌类型。
- 不显示真实牌 ID。
- 每次对手出牌消耗一次侦察机会。
- 多次使用可以叠加次数。
- 选择 Accept 同样消耗已触发次数。
- AI 只能使用合法获得的信息。

## Test 9 — Burden of Proof

验证：

- 0 AP 时可以质疑一次。
- 质疑失败不扣 AP。
- 质疑成功总计获得 2 AP。
- 恢复 AP 优先偿还 Debt。
- 效果不可叠加。
- 使用一次后立即失效。
- 对手回合结束时未使用的效果自动失效。
- AI 正确识别具有特殊质疑能力的 0 AP 玩家。

## Test 10 — Reviewer AI

验证：

- 两个 Reviewer 使用独立卡组。
- 两个 Reviewer 具有不同宣称池。
- AI 不会宣称未解锁高级牌。
- AI 不会通过隐藏信息作弊。
- AI 正确判断高级卡牌效果。
- 两个 Reviewer 在大量模拟对局中表现出不同的行动倾向。

## Test 11 — Paper Type

三个论文类型分别生成正确的初始高级牌。

玩家初始卡组均为 11 张。

对应高级牌在游戏开始时已经加入 Claim Pool。

## Test 12 — 战斗状态继承

第一场战斗结束后：

- 正确继承剩余 HP。
- 正确恢复 2 HP。
- 正确继承完整卡组和 Claim Pool。
- 清除 AP Debt、护盾和其他临时战斗状态。
- 第二场战斗重新洗牌和抽牌。

## Test 13 — 随机事件

验证：

- 一次 Run 中两个事件不重复。
- 未进入节点前不显示事件身份。
- 每个事件只能结算一次。
- HP 损失选项不会造成意外的 0 HP。
- 获得高级牌后正确解锁宣称。
- 返回界面不能重新抽取事件或奖励。

## Test 14 — 事件增益

测试：

- 初始 AP 增减叠加。
- 初始手牌 +2。
- 初始警惕值 -2。
- 初始 Cross-check 次数 +2。
- 所有增益遵守属性上下限。
- 已应用的增益不会重复触发。

## Test 15 — 完整 Run

能够依次完成：

Paper Submission → Reviewer #1 → Card Reward → Random Event 1 → Random Event 2 → Reviewer #2 → Final Decision。

验证各阶段不会卡死、重复跳转、重复奖励或丢失数据。

## Test 16 — 失败与重开

- 第一场战斗失败后无法进入后续节点。
- 最终战斗失败正确显示 Reject。
- 重新开始游戏不会继承上一局高级牌、事件增益或统计数据。
- 上一局尚未完成的动画和 AI 操作不会影响新游戏。

## Test 17 — 音乐切换

- 不同战斗播放不同音乐。
- 地图、奖励和事件之间切换不重启相同音乐。
- 不会同时出现多个持续播放的 BGM。
- 静音和音量设置正常。
- 重新开始游戏时音频状态正常重置。

---

# 21. Playtesting 与平衡调整

V2 完成后，需要重点观察以下问题。

## 21.1 游戏时长

目标为一次完整 Conference Run 约 5–10 分钟。

记录：

- Reviewer #1 战斗时长。
- 卡牌奖励及随机事件时长。
- Reviewer #2 战斗时长。
- 完整 Run 总时长。

如果完整 Run 明显超过 10 分钟，应优先简化动画、操作等待和非必要过场，而不是立即删除核心机制。

## 21.2 战斗平衡

观察：

- 同名费用递增是否导致攻击爆发过高。
- 第一场战斗是否过难。
- 第二场 Boss 战是否具有明显的挑战性。
- 不同 Paper Type 是否存在明显强弱差距。
- 永续护盾是否过强。
- 玩家是否能够通过高级牌形成策略组合。
- 失败一次质疑是否会导致过度滚雪球。

## 21.3 信息博弈

观察：

- 玩家是否会主动保留 AP。
- 玩家是否理解 Cross-check 的作用。
- 玩家是否利用 Burden of Proof 在 0 AP 时反制。
- 玩家是否会故意如实宣称诱导对方质疑。
- 玩家是否会主动利用 Red Herring 被识破时的收益。

## 21.4 Roguelike 成长

观察：

- 玩家是否能感受到获得新卡后的变化。
- 缩小卡组后高级牌出现频率是否合理。
- 玩家是否愿意尝试不同 Paper Type。
- 随机事件是否存在有意义的选择。
- 两个 Reviewer 是否需要不同的应对策略。

## 21.5 音乐反馈

观察：

- 普通战斗和 Boss 战音乐是否具有明显区别。
- 背景音乐是否仍然容易产生重复感。
- 音乐是否影响卡牌阅读。
- 场景切换是否自然。
- 音效和背景音乐的音量是否合适。

---

# 22. V2 最终交付标准

V2 完成时应包含：

- 完整可玩的 Conference Run。
- 三种 Paper Type。
- 两个具有不同策略的 Reviewer。
- 七种基础卡牌。
- 五种高级卡牌。
- 同名卡牌 AP 递增机制。
- 动态 Claim Pool。
- 永续护盾和新增状态效果。
- 固定单路线地图。
- 三选一卡牌奖励。
- 七种可随机出现的事件。
- 跨战斗状态继承。
- 六首场景音乐。
- 完整最终结局和 Run Summary。
- 更新后的规则说明。
- 正常运行的网页构建。
- 新增和更新后的自动化测试。

## 最终开发原则

1. 保留 V1 已经表现良好的内容。
2. 不进行无必要的整体重构。
3. 优先实现完整 Run，再完善视觉效果。
4. 不引入当前版本范围之外的系统。
5. 所有新增数值尽量配置化。
6. 保持 AI 信息公平。
7. 确保每个卡牌效果和随机事件只结算一次。
8. 新增卡牌应强化宣称与质疑机制，而非单纯增加数值。
9. 不引入固定出牌次数和护盾上限。
10. 以实际试玩结果作为后续平衡调整依据。

**V2 的最终目标：让玩家能够选择自己的研究论文类型，经历两位具有不同性格的 Reviewer，在随机科研事件中作出选择，逐步扩充卡组与宣称能力，最终获得属于自己的论文投稿结果。**