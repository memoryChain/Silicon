import { GameState } from './GameState';
import { ConfigManager } from './ConfigManager';
import { GameEventConfig, EventCondition, EventEffects } from '../data/EventData';
import { EventBus, GameEvents } from '../utils/EventBus';
import { AttrKey, WorldAttrKey } from '../data/GameConstants';

/**
 * 事件系统 —— 条件触发随机事件
 */
export class EventSystem {
  private state: GameState;
  private config: ConfigManager;
  /** 当前待处理的事件 */
  private pendingEvents: GameEventConfig[] = [];

  constructor(state: GameState, config: ConfigManager) {
    this.state = state;
    this.config = config;
  }

  /** 每 tick 扫描事件池 */
  scan(): void {
    for (const event of this.config.events) {
      if (this.shouldTrigger(event)) {
        this.pendingEvents.push(event);
        // 更新冷却
        this.state.eventCooldowns.set(event.id, this.state.time + event.cooldown);
      }
    }
  }

  /** 是否有待处理事件 */
  hasPending(): boolean {
    return this.pendingEvents.length > 0;
  }

  /** 取出下一个事件 */
  popNext(): GameEventConfig | null {
    return this.pendingEvents.shift() ?? null;
  }

  /** 应用事件效果 */
  applyEffects(effects: EventEffects): void {
    if (effects.attr) {
      for (const [key, delta] of Object.entries(effects.attr)) {
        const attr = this.state.attributes[key as AttrKey];
        if (attr) {
          attr.current += delta;
          EventBus.emit(GameEvents.ATTR_CHANGED, { name: key, old: attr.current - delta, new: attr.current });
        }
      }
    }
    if (effects.world) {
      for (const [key, delta] of Object.entries(effects.world)) {
        const wKey = key as WorldAttrKey;
        this.state.worldAttributes[wKey] += delta;
        EventBus.emit(GameEvents.WORLD_CHANGED, { name: key, old: this.state.worldAttributes[wKey] - delta, new: this.state.worldAttributes[wKey] });
      }
    }
  }

  private shouldTrigger(event: GameEventConfig): boolean {
    // 冷却检查
    const cooldownUntil = this.state.eventCooldowns.get(event.id) ?? -1;
    if (this.state.time < cooldownUntil) return false;

    // 条件检查
    if (!this.checkCondition(event.condition)) return false;

    // 概率检查
    return Math.random() < event.probability;
  }

  private checkCondition(cond: EventCondition): boolean {
    // 时代
    if (cond.era) {
      // 简单判断：通过时间范围判断
    }

    // 时间
    if (cond.minTime !== undefined && this.state.time < cond.minTime) return false;

    // 属性条件
    if (cond.attr) {
      for (const [key, range] of Object.entries(cond.attr)) {
        const val = this.state.attributes[key as AttrKey]?.current ?? 0;
        if (val < range[0] || val > range[1]) return false;
      }
    }

    // 世界属性条件
    if (cond.world) {
      for (const [key, range] of Object.entries(cond.world)) {
        const val = this.state.worldAttributes[key as WorldAttrKey] ?? 0;
        if (val < range[0] || val > range[1]) return false;
      }
    }

    return true;
  }
}
