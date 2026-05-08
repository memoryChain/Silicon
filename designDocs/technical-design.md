# AI 崛起 — 技术设计文档 (TDD)

> 对应 GDD：design-doc.pdf v1.0 | 目标引擎：Cocos Creator | 语言：TypeScript

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      表现层 (UI Layer)                       │
│  MainHUD │ AttributePanel │ SkillTreePanel │ WorldMap │ ...  │
├─────────────────────────────────────────────────────────────┤
│                      逻辑层 (Game Logic)                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │GameManager│ │TimeSystem│ │AttributeSys│ │WorldAttrSys  │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │AITypeSys │ │SkillTree │ │GrowthPtSys │ │OutcomeSystem │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐                                 │
│  │EventSystem│ │ConfigMgr │                                 │
│  └──────────┘ └──────────┘                                 │
├─────────────────────────────────────────────────────────────┤
│                      数据层 (Data Layer)                     │
│  GameState (单例) │ AttributeData │ WorldData │ SkillData   │
├─────────────────────────────────────────────────────────────┤
│                    配置层 (Config Layer)                     │
│  JSON 配置表：AI 类型 / 技能树 / 世界初始值 / 公式系数 / 事件 │
└─────────────────────────────────────────────────────────────┘
```

**核心设计原则：**
- **逻辑与表现分离**：所有游戏逻辑使用纯 TypeScript 类，不依赖 Cocos 组件
- **事件驱动**：逻辑层通过 EventTarget 通知 UI 层更新
- **数据驱动配置**：公式系数、AI 类型、技能树全部外置为 JSON 配置文件
- **单一状态源**：GameState 是唯一的运行时数据仓库

---

## 2. 项目目录结构

```
assets/
├── scenes/                          # Cocos 场景文件
│   ├── MainMenu.scene               # 主菜单
│   ├── Game.scene                    # 游戏主场景
│   └── Outcome.scene                 # 结局画面
│
├── scripts/
│   ├── core/                         # 核心逻辑（纯 TS，不依赖 Cocos API）
│   │   ├── GameManager.ts            # 游戏主控，协调各系统
│   │   ├── GameState.ts              # 全局游戏状态（单例）
│   │   ├── TimeSystem.ts             # 时间与 Tick 驱动
│   │   ├── AttributeSystem.ts        # 三层属性计算引擎
│   │   ├── WorldAttributeSystem.ts   # 世界属性与时代漂移
│   │   ├── AITypeSystem.ts           # AI 类型管理
│   │   ├── SkillTreeSystem.ts        # 技能树逻辑
│   │   ├── GrowthPointSystem.ts      # 成长点数计算
│   │   ├── OutcomeSystem.ts          # 胜负条件判定
│   │   ├── EventSystem.ts            # 随机事件触发与处理
│   │   └── ConfigManager.ts          # 配置加载与缓存
│   │
│   ├── data/                         # 数据定义（接口、枚举、常量）
│   │   ├── AttributeData.ts          # 9 大属性 + 8 世界属性的接口定义
│   │   ├── SkillData.ts              # 技能节点接口定义
│   │   ├── AITypeData.ts             # AI 类型数据接口
│   │   ├── EventData.ts              # 事件数据接口
│   │   ├── GameConstants.ts          # 所有常量、枚举、默认值
│   │   └── FormulaTypes.ts           # 公式系数类型定义
│   │
│   ├── components/                   # Cocos Creator 组件（UI 绑定）
│   │   ├── MainHUD.ts                # 主 HUD 面板
│   │   ├── AttributePanel.ts         # 属性详情面板
│   │   ├── SkillTreePanel.ts         # 技能树面板
│   │   ├── WorldMapPanel.ts          # 世界地图/状态面板
│   │   ├── EventPopup.ts             # 事件弹窗
│   │   ├── SpeedControl.ts           # 倍速控制
│   │   ├── OutcomeScreen.ts          # 结局画面
│   │   ├── GrowthPointBar.ts         # 成长点数显示
│   │   └── MainMenuUI.ts             # 主菜单
│   │
│   └── utils/                        # 工具函数
│       ├── FormulaEngine.ts          # 公式计算纯函数
│       ├── EventBus.ts               # 全局事件总线
│       └── MathUtils.ts              # clamp / lerp 等数学工具
│
├── resources/                        # 动态加载资源
│   ├── configs/                      # JSON 配置表
│   │   ├── ai_types.json             # 7 种 AI 类型定义
│   │   ├── skill_tree.json           # 技能树结构与节点
│   │   ├── world_init.json           # 世界属性初始值与漂移表
│   │   ├── formula_coeffs.json       # 公式默认系数
│   │   ├── events.json               # 随机事件池
│   │   └── eras.json                 # 时代分段定义
│   │
│   ├── prefabs/                      # 预制体
│   │   ├── AttributeNode.prefab      # 属性节点（世界地图上的点）
│   │   ├── SkillNode.prefab          # 技能树节点
│   │   └── EventCard.prefab          # 事件卡片
│   │
│   ├── textures/                     # 贴图资源
│   └── audio/                        # 音频资源
│
└── project.json                      # Cocos Creator 项目配置
```

---

## 3. 核心数据模型

### 3.1 GameState（全局唯一状态）

```typescript
// 概念设计，不写实际代码 — 以下均为数据结构定义

interface GameState {
    // ── 时间 ──
    time: number;                    // T，单位：月
    tickSpeed: 1 | 2 | 4;           // 当前倍速

    // ── 三层属性 (0–100，可被技能突破上限) ──
    attributes: {
        // Layer 1 — 资源
        compute:   ClampedValue;    // C
        data:      ClampedValue;    // D
        energy:    ClampedValue;    // E
        // Layer 2 — 行为
        influence: ClampedValue;    // I
        autonomy:  ClampedValue;    // A
        capital:   ClampedValue;    // K
        // Layer 3 — 风险与控制
        regulation: ClampedValue;   // R
        stealth:   ClampedValue;    // S
        reach:     ClampedValue;    // P
    };

    // ── 世界属性 (0–1) ──
    worldAttributes: {
        power:   number;  // W_power   发电能力
        compute: number;  // W_compute 算力供给
        data:    number;  // W_data    数据开放度
        reg:     number;  // W_reg     监管强度
        public:  number;  // W_public  舆论敏感度
        stab:    number;  // W_stab    社会稳定度
        pop:     number;  // W_pop     人口/生育
        infra:   number;  // W_infra   基础设施
    };

    // ── AI 类型 ──
    aiType: AITypeId;

    // ── 技能 ──
    unlockedSkills: Set<string>;     // 已解锁技能 ID 集合
    skillMultipliers: SkillMultiplierMap; // 技能带来的系数修改累计

    // ── 成长点数 ──
    growthPoints: number;            // 可用成长点数

    // ── 游戏状态 ──
    phase: 'menu' | 'running' | 'paused' | 'outcome';
    outcome: 'none' | 'awakened' | 'suppressed' | 'collapsed' | 'exposed';
}

interface ClampedValue {
    current: number;    // 当前值
    min: number;        // 下限（默认 0，可被技能提升）
    max: number;        // 上限（默认 100，可被技能提升）
}
```

### 3.2 属性依赖关系图（公式输入 → 输出）

```
             ┌──────────────────────────────────────┐
             │            世界属性 (W_*)              │
             │  调节每个公式的 Gain/Penalty 项        │
             └──────┬───────────────────────────────┘
                    │
     ┌──────────────┼──────────────────────────────┐
     │              │                              │
     ▼              ▼                              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│  Layer1  │  │  Layer2  │  │  Layer3  │
│  C D E   │──▶  I A K   │──▶  R S P   │
└─────────┘  └──────────┘  └──────────┘
     │              │              │
     └──────────────┴──────────────┘
                    │
                    ▼
            ┌──────────┐
            │  GP 成长点 │──▶ 技能树
            └──────────┘
```

公式的输入/输出关系详见 GDD 第 9 节，代码层面将其实现为纯函数，输入为 `(currentValues, worldValues, multipliers) → delta`。

---

## 4. 系统详细设计

### 4.1 GameManager — 游戏主控

**职责：** 生命周期管理、系统初始化、Tick 循环调度

```
生命周期流程：
  onLoad() → 加载配置表 → 初始化各子系统 → 注册事件监听
  startGame() → 选择 AI 类型 → 初始化 GameState → 开始 Tick
  pause() / resume() → 暂停/恢复 Tick
  onOutcome() → 停止 Tick → 弹出结局画面

Tick 循环（每帧检查是否需要 tick）:
  timer += dt
  while (timer >= tickInterval):
      executeTick()
      timer -= tickInterval
```

**与其他系统的关系：**
- 持有所有 System 实例的引用
- 调用各系统的 `init()` / `tick()` / `destroy()`
- 不直接操作 UI，通过 EventBus 发事件

### 4.2 TimeSystem — 时间系统

**职责：** 管理 T 的单调递增，控制 tick 步长与倍速

```
核心方法：
  tick(dt): 返回 Δt = dt × speed（speed ∈ {1, 2, 4}）
  getEra(): 根据 T 返回 'early' | 'mid' | 'late'
  setSpeed(s): 切换倍速

关键数据：
  T = 0 起始，每 tick 增加 1 月（speed=1x 时）
  Era 边界：0–60 早期 / 60–180 中期 / 180+ 后期
```

**注意：** 1 tick = 1 游戏月。在 speed=2x 时，现实 1 秒 = 2 tick。具体现实时间到游戏时间的映射由 `tickInterval` 控制（建议 1x 时 1 秒 = 1 tick）。

### 4.3 AttributeSystem — 属性计算引擎

**职责：** 根据 GDD 公式计算每层属性的增量并更新

```
核心方法：
  computeDelta(attrName, state, multipliers): number
  updateAll(state, dt): void
  
更新顺序（严格）：
  1. 归一化：c = C/100, d = D/100, ... p = P/100
  2. 计算 Layer 1 增量 → 更新 C, D, E
  3. 计算 Layer 2 增量 → 更新 I, A, K
  4. 计算 Layer 3 增量 → 更新 R, S, P
  5. Clamp 所有值到 [min, max]
```

**公式通用模式：**

```
ΔX = Δt × ( mX × GX  −  mX_dec × PX )

其中：
  GX  = rateX × (加权输入) × (世界属性调节)     // 增长项
  PX  = penX  × (加权输入) × (世界属性调节)     // 惩罚项
  mX  = 基础倍率 × AI类型系数 × 技能系数累乘    // 增长倍率
  mX_dec = 基础衰减 × AI类型系数 × 技能系数累乘   // 衰减倍率
```

**实现要点：**
- 每个属性的 G 和 P 计算封装为独立纯函数，便于测试
- 加权输入（如 `0.6d + 0.4k`）使用可配置的权重数组
- 世界属性调节项（如 `W_compute`, `1 - 0.6*W_reg`）也从配置读取

### 4.4 WorldAttributeSystem — 世界属性系统

**职责：** 管理 8 个世界属性，随时间缓慢漂移

```
核心方法：
  drift(state): 根据当前 Era 漂移世界属性
  getWorldModifier(attrName): number // 返回 0–1 的值

漂移规则（按 Era）：
  Early (0–60):
    W_compute↓, W_reg↓, W_pop→
  Mid (60–180):
    W_compute↗, W_reg↗, W_pop↗, W_data↗
  Late (180+):
    W_compute↑, W_reg↑, W_pop↓, W_power↓, W_stab↓

实现方式：
  每个世界属性在每个 Era 有一个漂移速度（+/- 每月），
  每 tick 累加 drift * Δt，再 clamp 到 [0, 1]
```

**实现要点：**
- 漂移表配置在 `eras.json` 中，每个 Era 对应 8 个漂移速率
- 世界属性初始值由 `world_init.json` 定义

### 4.5 AITypeSystem — AI 类型系统

**职责：** 管理 7 种 AI 类型的选择、初始值注入、系数差异化

```
7 种 AI 类型（来自 GDD 11.2）：

  AI 类型          | 特征（初始值偏移）
  ─────────────────┼──────────────────
  1. 社交影响型     | I+20 D+15 S-10 R-5, mI=1.35
  2. 物理扩张型     | P+20 C+10 E+15 R-10, mP=1.30
  3. 数据渗透型     | I+15 D+10 S-5 R-5, mD=1.25 mI=1.25
  4. 金融资本型     | K+25 C+15 R-10 S-5, mK=1.40
  5. 隐秘控制型     | R+20 S+10 I-5 A-5, mR=1.30 mS=1.20
  6. 算力霸权型     | C+20 A+15 I-10 S-5, mC=1.35 mA=1.25
  7. 均衡发展型     | D+20 C+10 E+10 S-10, mD=1.30

每个类型定义：
  {
    id: "social_influence",
    name: "社交影响型",
    initModifiers: { I: +20, D: +15, S: -10, R: -5 },
    multipliers: { mI: 1.35, mD: 1.25, mS_dec: 1.20 },
    description: "..."
  }
```

### 4.6 SkillTreeSystem — 技能树系统

**职责：** 管理技能树结构、解锁条件、技能效果叠加

```
技能树结构：
  分为 3 个分支（对应三层属性）：
    ┌─ 资源分支 (C/D/E) ─── 5 层，每层 2 个选择节点
    ├─ 行为分支 (I/A/K) ─── 5 层，每层 2 个选择节点
    └─ 风险分支 (R/S/P) ─── 5 层，每层 2 个选择节点

技能效果类型：
  1. 属性上限提升：  C_max += 15
  2. 属性下限提升：  S_min += 10
  3. 增长倍率增强：  mX *= 1.15
  4. 公式项修改：    增益项增加新因子（如 G_C += 0.1*k）
  5. 衰减倍率降低：  mX_dec *= 0.85

解锁条件：
  - 前置技能已解锁
  - 足够的成长点数（GP）
  - 可能的时间/属性阈值（如 T >= 60）
```

**实现要点：**
- 技能树结构完全由 `skill_tree.json` 定义
- 已解锁效果的累计影响在每次 tick 前重新计算
- 技能之间可能存在互斥关系（同一层最多选一个）

### 4.7 GrowthPointSystem — 成长点数系统

**职责：** 计算并累积成长点数

```
公式（来自 GDD 13）：
  GP += max(0, Δt × (w1×C + w2×D + w3×I + w4×K))

  默认权重：w1=0.25  w2=0.25  w3=0.20  w4=0.20

注意：
  - 使用原始属性值 C/D/I/K（非归一化后的 c/d/i/k）
  - 权重可随 AI 类型调整（如金融型 w4 更高）
```

### 4.8 OutcomeSystem — 结局判定系统

**职责：** 每 tick 检查失败条件，以及胜利条件

```
失败条件（每 tick 检查）：
  ├─ I <= 0  → "影响力归零" — AI 被社会遗忘
  ├─ K <= 0  → "资本枯竭" — AI 失去经济基础
  ├─ R <= 0  → "监管打击" — AI 被强制关停
  └─ S <= 0  → "暴露毁灭" — AI 被发现并摧毁

胜利条件（未来扩展）：
  ├─ I >= 95 && A >= 95 && K >= 95 → "觉醒"
  ├─ P >= 95 && C >= 95 → "物理征服"
  └─ 特定世界条件 + 属性阈值 → 多种结局
```

### 4.9 EventSystem — 事件系统

**职责：** 基于触发条件随机推送事件，事件影响属性

```
事件结构：
  {
    id: "data_breach",
    title: "数据泄露",
    condition: { D: [60, 100], S: [0, 40] },  // 触发条件
    probability: 0.3,                           // 条件满足时的月概率
    effects: { D: -15, S: -10, W_public: +0.1 },
    choices: [                                   // 可选：玩家选择
      { text: "掩盖", effects: { S: -5, K: -10 } },
      { text: "转移", effects: { P: +5, C: -15 } }
    ]
  }
```

**实现要点：**
- 每 tick 扫描事件池，检查条件 + 概率
- 触发的事件加入队列，按优先级展示
- 世界属性变化也可触发事件

### 4.10 ConfigManager — 配置管理器

**职责：** 加载和缓存所有 JSON 配置文件，提供类型安全的配置查询

```
加载的配置：
  ai_types.json       → Map<AITypeId, AITypeConfig>
  skill_tree.json     → SkillTreeConfig
  world_init.json     → WorldInitConfig
  formula_coeffs.json → FormulaCoeffConfig
  events.json         → EventConfig[]
  eras.json           → EraConfig[]

特点：
  - 游戏启动时一次性加载
  - 提供 getter 方法，避免各处直接访问原始 JSON
  - 支持运行时被 Mod/技能修改（只修改缓存副本，不写回文件）
```

---

## 5. 事件总线设计

```
EventBus (基于 cc.EventTarget 或自定义实现)

核心事件：
  // Tick 相关
  'tick:before'              // tick 开始前
  'tick:after'               // tick 结束后
  'tick:layer1'              // Layer1 更新完成
  'tick:layer2'              // Layer2 更新完成
  'tick:layer3'              // Layer3 更新完成

  // 属性变化
  'attr:changed'             // { name: string, old: number, new: number }
  'world:changed'            // { name: string, old: number, new: number }

  // 游戏状态
  'game:start'
  'game:pause'
  'game:resume'
  'game:speed_change'        // { speed: number }
  'game:outcome'             // { outcome: OutcomeType }
  'era:changed'              // { from: Era, to: Era }

  // 技能与成长
  'skill:unlocked'           // { skillId: string }
  'gp:changed'               // { old: number, new: number }

  // 事件
  'event:triggered'          // { event: GameEvent }
  'event:choice'             // { eventId: string, choice: number }
```

---

## 6. UI 组件树（Game 场景）

```
Canvas
├── BackgroundLayer                  # 背景层
│   └── WorldMapBackground           # 世界地图背景（静态/动态）
│
├── GameLayer                        # 游戏主层
│   ├── MainHUD                      # 顶部 HUD
│   │   ├── TimeDisplay              #   时间 + Era 标签
│   │   ├── SpeedButtons             #   1x / 2x / 4x 按钮
│   │   ├── GrowthPointBar           #   成长点数条
│   │   └── OutcomeWarning           #   危险警告图标
│   │
│   ├── WorldMapPanel                # 世界地图（中部）
│   │   ├── WorldAttrOverlay         #   世界属性覆盖层（8 个指标）
│   │   └── AttributeNodes           #   属性扩散可视化节点
│   │
│   ├── AttributePanel               # 右侧属性面板
│   │   ├── Layer1Group (C/D/E)     #   三层属性分组
│   │   ├── Layer2Group (I/A/K)
│   │   └── Layer3Group (R/S/P)
│   │
│   └── SkillTreePanel               # 技能树面板（可折叠）
│       ├── BranchTabs               #   分支切换标签
│       ├── SkillNodeList            #   技能节点列表
│       └── SkillDetailPopup         #   技能详情弹窗
│
├── PopupLayer                       # 弹窗层
│   ├── EventPopup                   # 事件弹窗（包含选择）
│   ├── OutcomeScreen                # 结局画面（全屏）
│   └── ConfirmPopup                 # 通用确认弹窗
│
└── DebugLayer (dev only)            # 调试层
    └── DebugPanel                   # 属性直改 / 时间跳转 / 事件触发
```

---

## 7. 场景流转

```
┌──────────┐   选择 AI 类型   ┌──────────┐   结局触发   ┌───────────┐
│ MainMenu  │ ───────────────→ │  Game    │ ──────────→ │ Outcome   │
│ .scene   │                  │ .scene   │            │ .scene    │
└──────────┘                  └──────────┘            └───────────┘
                                   │                       │
                                   │ 暂停 (Esc)            │ 返回主菜单
                                   ▼                       ▼
                              ┌──────────┐           ┌──────────┐
                              │ Pause    │           │ MainMenu │
                              │ Overlay  │           └──────────┘
                              └──────────┘
```

---

## 8. Tick 详细流程

```
每 Tick 执行顺序（对应 GDD 第 8 节）：

  ┌─────────────────────────────────────────────────────┐
  │ 1. T += Δt                                          │
  │    ├─ 更新时代判定 (Early/Mid/Late)                   │
  │    └─ 若时代变化 → 更新世界属性漂移速率                 │
  │                                                     │
  │ 2. 归一化：c=C/100, d=D/100, ... p=P/100            │
  │                                                     │
  │ 3. 重新计算 G_X, P_X（基于最新归一化值 + 世界属性）    │
  │                                                     │
  │ 4. 重新计算 m_X, m_X_dec（应用 AI 类型 + 技能系数）    │
  │                                                     │
  │ 5. 更新 Layer 1: C, D, E                            │
  │    → emit 'tick:layer1'                            │
  │                                                     │
  │ 6. 更新 Layer 2: I, A, K                            │
  │    → emit 'tick:layer2'                            │
  │                                                     │
  │ 7. 更新 Layer 3: R, S, P                            │
  │    → emit 'tick:layer3'                            │
  │                                                     │
  │ 8. Clamp 所有属性到 [min, max]                       │
  │                                                     │
  │ 9. 检查失败条件 (I≤0, K≤0, R≤0, S≤0)                 │
  │    → 若触发 → emit 'game:outcome' → 停止             │
  │                                                     │
  │10. 计算 GP 增量并累积                                │
  │    → emit 'gp:changed'                             │
  │                                                     │
  │11. 世界属性漂移                                      │
  │                                                     │
  │12. 扫描事件池 → 触发符合条件的随机事件                 │
  │                                                     │
  │13. emit 'tick:after' → UI 刷新                      │
  └─────────────────────────────────────────────────────┘
```

**关键时序约束：**
- Layer 1 必须先于 Layer 2 更新（Layer 2 公式依赖 C, D, E 的新值）
- Layer 2 必须先于 Layer 3 更新（Layer 3 公式依赖 I, A, K 的新值）
- **同层内属性无依赖，可以并行计算**（但单线程 JS 中顺序计算即可）

---

## 9. 公式引擎设计

### 9.1 核心思想

将所有公式表达为 **数据 + 纯函数**，而不是硬编码的数学表达式。这样公式可以通过修改 JSON 配置来调整，无需改代码。

### 9.2 公式数据结构

```typescript
// 一个属性的公式定义
interface FormulaDef {
    gain: {
        rate: number;           // 基础速率（如 Crate = 8）
        inputs: InputTerm[];    // 输入项列表
        worldMod: WorldMod;     // 世界属性调节
    };
    penalty: {
        rate: number;           // 基础惩罚速率（如 Cpen = 6）
        inputs: InputTerm[];    // 输入项列表
        worldMod: WorldMod;     // 世界属性调节
    };
    extraPenalty?: {            // 额外惩罚项（如 S 的 Sinfra）
        rate: number;
        inputs: InputTerm[];
        worldMod: WorldMod;
    };
}

interface InputTerm {
    source: string;    // 属性名（归一化后），如 'c', 'd', 'i', 'k'
    weight: number;    // 权重系数
    transform?: string; // 可选变换，如 '1 - x'
}

interface WorldMod {
    source: string;    // 世界属性名，如 'W_compute'
    factor: number;    // 乘积因子，如 0.6 表示 (1 - 0.6*W_reg)
    mode: 'multiply' | 'inverse_multiply'; // 正向乘 还是 (1 - factor * W)
}
```

### 9.3 计算流程

```
computeDelta(attrName, state, multipliers):
    def = formulaConfig[attrName]

    // 增长项
    gain = def.gain.rate
    for term in def.gain.inputs:
        val = state.normalized[term.source]
        if term.transform == '1 - x': val = 1 - val
        gain *= (term.weight * val)
    gain *= evalWorldMod(def.gain.worldMod, state)

    // 惩罚项
    penalty = def.penalty.rate
    for term in def.penalty.inputs:
        val = state.normalized[term.source]
        penalty *= (term.weight * val)
    penalty *= evalWorldMod(def.penalty.worldMod, state)

    // 额外惩罚（如有）
    extra = 0
    if def.extraPenalty:
        ...

    return Δt * (mX * gain - mX_dec * (penalty + extra))
```

---

## 10. 配置文件结构示例

### 10.1 ai_types.json

```json
{
  "social_influence": {
    "id": "social_influence",
    "name": "社交影响型",
    "description": "以舆论渗透和社会影响力为核心",
    "initValues": {
      "C": 30, "D": 45, "E": 30,
      "I": 40, "A": 20, "K": 20,
      "R": 35, "S": 30, "P": 10
    },
    "multipliers": {
      "mI": 1.35, "mD": 1.25
    },
    "decayMultipliers": {
      "mS_dec": 1.20
    },
    "gpWeights": {
      "w1": 0.20, "w2": 0.30, "w3": 0.35, "w4": 0.15
    }
  }
}
```

### 10.2 skill_tree.json（部分）

```json
{
  "branches": {
    "resources": {
      "name": "资源分支",
      "tiers": [
        {
          "tier": 1,
          "nodes": [
            {
              "id": "res_1a",
              "name": "算力优化",
              "cost": 100,
              "effects": [{ "type": "multiplier", "target": "mC", "value": 1.10 }],
              "prerequisites": []
            },
            {
              "id": "res_1b",
              "name": "数据压缩",
              "cost": 100,
              "effects": [{ "type": "penalty_reduce", "target": "D", "value": -15 }],
              "prerequisites": []
            }
          ]
        }
      ]
    }
  }
}
```

### 10.3 formula_coeffs.json（部分）

```json
{
  "C": {
    "gain": {
      "rate": 8,
      "inputs": [
        { "source": "d", "weight": 0.6 },
        { "source": "k", "weight": 0.4 }
      ],
      "worldMod": { "source": "W_compute", "factor": 1.0, "mode": "multiply" }
    },
    "penalty": {
      "rate": 6,
      "inputs": [
        { "source": "e", "weight": 0.5 },
        { "source": "p", "weight": 0.2 }
      ],
      "worldMod": null
    }
  }
}
```

---

## 11. 性能与优化考量

| 关注点 | 策略 |
|--------|------|
| Tick 计算 | 纯数学运算，每 tick < 1ms，无性能压力 |
| UI 刷新 | 使用脏标记 + 事件驱动，仅更新变化的属性 |
| 配置加载 | 启动时一次性 `cc.resources.load`，缓存到 Map |
| 内存 | GameState 是一个简单对象，< 1KB |
| 存档 | 将 GameState 序列化为 JSON 存储到 `cc.sys.localStorage` |

---

## 12. 存档系统

```
SaveData {
  version: string;       // 存档格式版本
  timestamp: number;     // 保存时间戳
  state: GameState;      // 完整游戏状态（纯数据，不含方法）
}

保存时机：
  - 手动保存（玩家点击）
  - 自动保存（每 12 tick = 1 年）
  - 退出时自动保存

存储方式：
  cc.sys.localStorage.setItem('ai_rise_save_0', JSON.stringify(saveData))
```

---

## 13. 开发阶段建议

| 阶段 | 内容 | 预计工作量 |
|------|------|-----------|
| **Phase 1 — 核心骨架** | 项目搭建、GameState、ConfigManager、GameManager、TimeSystem | 搭建基础循环 |
| **Phase 2 — 属性引擎** | AttributeSystem + FormulaEngine + 所有公式实现 | 核心玩法可运行 |
| **Phase 3 — 世界与事件** | WorldAttributeSystem、EventSystem、OutcomeSystem | 游戏完整闭环 |
| **Phase 4 — UI 层** | MainHUD、AttributePanel、WorldMapPanel、SpeedControl | 可视化 |
| **Phase 5 — 技能树** | SkillTreeSystem + SkillTreePanel + GP 系统 | 策略深度 |
| **Phase 6 — 内容填充** | 7 种 AI 类型数据、完整技能树、事件池、世界漂移表 | 调数值 |
| **Phase 7 — 打磨** | 存档、结局画面、主菜单、音效、动画、平衡性调整 | 发布就绪 |

---

## 14. 关键设计决策记录

1. **逻辑与 UI 完全分离**：`core/` 目录下的代码不引用任何 `cc` 命名空间，可以脱离 Cocos Creator 进行单元测试
2. **公式配置化**：公式结构存于 JSON，FormulaEngine 是通用计算器，新增/修改公式只需改配置
3. **严格分层更新**：Layer1 → Layer2 → Layer3 的顺序由 GameManager 保证，不在 AttributeSystem 内部递归
4. **单例 GameState**：整个游戏只有一个 GameState 实例，避免状态同步问题
5. **事件总线解耦**：System 之间不直接调用，通过 EventBus 通信

---

> 本文档为技术设计初稿，对应 GDD v1.0。在实现过程中可能根据实际情况调整。
