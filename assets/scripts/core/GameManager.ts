import { GameState } from './GameState';
import { ConfigManager } from './ConfigManager';
import { TimeSystem } from './TimeSystem';
import { AttributeSystem } from './AttributeSystem';
import { WorldAttributeSystem } from './WorldAttributeSystem';
import { AITypeSystem } from './AITypeSystem';
import { SkillTreeSystem } from './SkillTreeSystem';
import { GrowthPointSystem } from './GrowthPointSystem';
import { OutcomeSystem } from './OutcomeSystem';
import { EventSystem } from './EventSystem';
import { FormulaEngine } from '../utils/FormulaEngine';
import { EventBus, GameEvents } from '../utils/EventBus';
import { GamePhase, OutcomeType, TICK_INTERVAL } from '../data/GameConstants';

/**
 * GameManager —— 游戏主控，协调所有子系统
 *
 * 以 Component 形式挂载在场景节点上，由 Cocos Creator 驱动 update()
 */
export class GameManager {
  // ── 子系统 ──
  state: GameState;
  config: ConfigManager;
  timeSystem: TimeSystem;
  attrSystem: AttributeSystem;
  worldSystem: WorldAttributeSystem;
  aiTypeSystem: AITypeSystem;
  skillSystem: SkillTreeSystem;
  gpSystem: GrowthPointSystem;
  outcomeSystem: OutcomeSystem;
  eventSystem: EventSystem;

  // ── Tick 计时 ──
  private tickTimer: number = 0;
  private running: boolean = false;

  // ── 外部回调（由 Component 注入） ──
  onOutcome?: (outcome: OutcomeType) => void;
  onEvent?: (event: any) => void;

  constructor() {
    this.state = GameState.instance;
    this.config = new ConfigManager();
    this.timeSystem = new TimeSystem(this.state);
    this.gpSystem = new GrowthPointSystem(this.state);
    this.outcomeSystem = new OutcomeSystem(this.state);
    // FormulaEngine / AttributeSystem / WorldSystem / SkillSystem / EventSystem
    // 延迟初始化，需要配置加载完成后才能创建
    this.attrSystem = null!;
    this.worldSystem = null!;
    this.skillSystem = null!;
    this.eventSystem = null!;
    this.aiTypeSystem = null!;
  }

  /** 初始化：加载配置 → 创建引擎 → 创建子系统 */
  init(): void {
    this.config.loadAll();

    const engine = new FormulaEngine(this.config.formulaConfig!);
    this.attrSystem = new AttributeSystem(this.state, engine);
    this.worldSystem = new WorldAttributeSystem(this.state, this.config);
    this.skillSystem = new SkillTreeSystem(this.state, this.config);
    this.eventSystem = new EventSystem(this.state, this.config);
    this.aiTypeSystem = new AITypeSystem(this.state, this.config);
  }

  /** 开始新游戏 */
  startGame(aiTypeId: string): void {
    this.state.reset();
    const ok = this.aiTypeSystem.selectType(aiTypeId);
    if (!ok) {
      console.error(`[GameManager] 未知 AI 类型: ${aiTypeId}`);
      return;
    }

    // 初始化技能倍率快照
    this.skillSystem.rebuildMultiplierSnapshot();
    // 注入世界初始值
    const worldInit = this.config.worldInit;
    if (worldInit) {
      Object.assign(this.state.worldAttributes, worldInit);
    }

    this.running = true;
    this.tickTimer = 0;
    this.state.phase = GamePhase.RUNNING;

    EventBus.emit(GameEvents.GAME_START);
  }

  /** 暂停/恢复 */
  togglePause(): void {
    if (this.state.phase === GamePhase.RUNNING) {
      this.state.phase = GamePhase.PAUSED;
      EventBus.emit(GameEvents.GAME_PAUSE);
    } else if (this.state.phase === GamePhase.PAUSED) {
      this.state.phase = GamePhase.RUNNING;
      EventBus.emit(GameEvents.GAME_RESUME);
    }
  }

  /** 每帧由 Cocos Creator 调用的 update */
  update(realDt: number): void {
    if (!this.running) return;
    if (this.state.phase !== GamePhase.RUNNING) return;

    this.tickTimer += realDt;

    while (this.tickTimer >= TICK_INTERVAL) {
      this.tickTimer -= TICK_INTERVAL;
      this.executeTick();
    }
  }

  /** 执行一次 tick */
  private executeTick(): void {
    EventBus.emit(GameEvents.TICK_BEFORE);

    // 1. 时间推进 + 时代判定
    const dt = this.timeSystem.tick(1.0); // 基础 1 月/ tick
    const era = this.timeSystem.getEra();

    // 2. 重新计算技能倍率快照
    this.skillSystem.rebuildMultiplierSnapshot();

    // 3. 属性三层更新（内部按 Layer1→Layer2→Layer3 执行）
    this.attrSystem.updateAll(dt);

    // 4. 结局判定
    const outcome = this.outcomeSystem.check();
    if (outcome !== OutcomeType.NONE) {
      this.running = false;
      this.state.phase = GamePhase.OUTCOME;
      this.onOutcome?.(outcome);
      return;
    }

    // 5. 成长点数累积
    this.gpSystem.accumulate(dt);

    // 6. 世界属性漂移
    this.worldSystem.drift(era, dt);

    // 7. 事件扫描
    this.eventSystem.scan();
    if (this.eventSystem.hasPending()) {
      const evt = this.eventSystem.popNext();
      if (evt) {
        EventBus.emit(GameEvents.EVENT_TRIGGERED, { event: evt });
        this.onEvent?.(evt);
      }
    }

    EventBus.emit(GameEvents.TICK_AFTER);
  }

  /** 处理玩家事件选择 */
  resolveEvent(eventId: string, choiceIndex: number): void {
    // 重新从配置获取事件（简化处理）
    const evt = this.config.events.find(e => e.id === eventId);
    if (!evt || !evt.choices) return;

    const choice = evt.choices[choiceIndex];
    if (choice) {
      this.eventSystem.applyEffects(choice.effects);
    }
  }
}

/** 全局 GameManager 实例 */
export const gameManager = new GameManager();
