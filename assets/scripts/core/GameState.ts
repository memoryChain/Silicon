import { GamePhase, OutcomeType, GameSpeed, DEFAULT_SPEED, AttrKey } from '../data/GameConstants';
import {
  AIAttributes, WorldAttributes, ClampedValue,
  createDefaultAttrs, createDefaultWorld, normalizeAttrs, NormalizedAttrs, MultiplierSnapshot,
} from '../data/AttributeData';
import { AITypeConfig } from '../data/AITypeData';

/** 全局游戏状态（单例） */
export class GameState {
  // ── 时间 ──
  time: number = 0;
  tickSpeed: GameSpeed = DEFAULT_SPEED;

  // ── 三层属性 ──
  attributes: AIAttributes = createDefaultAttrs();

  // ── 世界属性 ──
  worldAttributes: WorldAttributes = createDefaultWorld();

  // ── AI 类型 ──
  aiType: AITypeConfig | null = null;

  // ── 技能 ──
  unlockedSkills: Set<string> = new Set();
  /** 技能带来的系数修改累计快照（每次 tick 前重算） */
  multiplierSnapshot: MultiplierSnapshot = {};

  // ── 成长点数 ──
  growthPoints: number = 0;

  // ── 游戏状态 ──
  phase: GamePhase = GamePhase.MENU;
  outcome: OutcomeType = OutcomeType.NONE;

  // ── 事件冷却跟踪 ──
  eventCooldowns: Map<string, number> = new Map();

  // ── 单例 ──
  private static _instance: GameState;
  static get instance(): GameState {
    if (!GameState._instance) {
      GameState._instance = new GameState();
    }
    return GameState._instance;
  }

  /** 重置为初始状态 */
  reset(): void {
    this.time = 0;
    this.tickSpeed = DEFAULT_SPEED;
    this.attributes = createDefaultAttrs();
    this.worldAttributes = createDefaultWorld();
    this.aiType = null;
    this.unlockedSkills.clear();
    this.multiplierSnapshot = {};
    this.growthPoints = 0;
    this.phase = GamePhase.MENU;
    this.outcome = OutcomeType.NONE;
    this.eventCooldowns.clear();
  }

  /** 应用 AI 类型初始值 */
  applyAIType(config: AITypeConfig): void {
    this.aiType = config;
    if (config.initValues) {
      for (const [key, value] of Object.entries(config.initValues)) {
        const attrKey = key as AttrKey;
        if (this.attributes[attrKey]) {
          this.attributes[attrKey].current += value;
        }
      }
    }
    this.phase = GamePhase.RUNNING;
  }

  /** 获取归一化属性值 */
  get normalized(): NormalizedAttrs {
    return normalizeAttrs(this.attributes);
  }

  /** 序列化为可保存的纯数据 */
  toSaveData(): object {
    return {
      time: this.time,
      tickSpeed: this.tickSpeed,
      attributes: this.attributes,
      worldAttributes: this.worldAttributes,
      aiTypeId: this.aiType?.id ?? null,
      unlockedSkills: Array.from(this.unlockedSkills),
      growthPoints: this.growthPoints,
      phase: this.phase,
      outcome: this.outcome,
    };
  }
}
