import { GameState } from './GameState';
import { EventBus, GameEvents } from '../utils/EventBus';
import { AttrKey, WorldAttrKey } from '../data/GameConstants';

export interface EventConfig {
  id: string;
  date: string;
  title: string;
  category: string;
  effects: {
    world?: Partial<Record<string, number>>;
    attr?: Partial<Record<string, number>>;
    gp?: number;
  };
}

export interface TriggeredEvent {
  config: EventConfig;
  triggerTime: number; // 游戏周数
}

/**
 * 事件系统 —— 每月随机触发 0-3 个事件，影响世界/属性/GP
 */
export class EventSystem {
  private state: GameState;
  private _events: EventConfig[] = [];
  private _lastMonthChecked = -1;
  private _pendingQueue: TriggeredEvent[] = [];
  private _usedEventIds: Set<string> = new Set();

  constructor(state: GameState) {
    this.state = state;
  }

  /** 从 JSON 加载事件配置 */
  loadConfig(events: EventConfig[]): void {
    this._events = [...events].sort((a, b) => a.date.localeCompare(b.date));
  }

  /** 每 tick 检查是否需要触发事件 */
  tick(): void {
    const s = this.state;
    // 游戏时间（周）→ 月
    const currentMonth = Math.floor(s.time / 4.35);
    if (currentMonth <= this._lastMonthChecked) return;
    this._lastMonthChecked = currentMonth;

    // 按时代决定事件频率
    const t = s.time;
    let count = 0;
    if (t < 60) {
      // 早期：0-1 条，70%概率
      count = Math.random() < 0.7 ? 1 : 0;
    } else if (t < 180) {
      // 中期：0-2 条
      const r = Math.random();
      count = r < 0.3 ? 0 : r < 0.8 ? 1 : 2;
    } else {
      // 后期：0-3 条，3条概率低
      const r = Math.random();
      count = r < 0.2 ? 0 : r < 0.6 ? 1 : r < 0.85 ? 2 : 3;
    }
    if (count === 0) return;

    const selected = this.pickEvents(count);
    for (const evt of selected) {
      this.applyEvent(evt);
    }
  }

  /** 从未使用的事件中随机选择 */
  private pickEvents(count: number): EventConfig[] {
    const available = this._events.filter(e => !this._usedEventIds.has(e.id));
    if (available.length === 0) {
      // 全部用完，重置
      this._usedEventIds.clear();
    }

    const pool = this._events.filter(e => !this._usedEventIds.has(e.id));
    const picked: EventConfig[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const evt = pool.splice(idx, 1)[0];
      this._usedEventIds.add(evt.id);
      picked.push(evt);
    }
    return picked;
  }

  /** 应用事件效果 */
  private applyEvent(evt: EventConfig): void {
    const s = this.state;
    const ef = evt.effects;

    // 世界属性
    if (ef.world) {
      for (const [key, delta] of Object.entries(ef.world)) {
        const wKey = key as WorldAttrKey;
        s.worldAttributes[wKey] = Math.max(0, Math.min(1, s.worldAttributes[wKey] + delta / 100));
        EventBus.emit(GameEvents.WORLD_CHANGED, { name: key, old: s.worldAttributes[wKey] - delta / 100, new: s.worldAttributes[wKey] });
      }
    }

    // AI 属性
    if (ef.attr) {
      for (const [key, delta] of Object.entries(ef.attr)) {
        const aKey = key as AttrKey;
        if (s.attributes[aKey]) {
          s.attributes[aKey].current += delta;
          EventBus.emit(GameEvents.ATTR_CHANGED, { name: key, old: s.attributes[aKey].current - delta, new: s.attributes[aKey].current });
        }
      }
    }

    // 技能点
    if (ef.gp && ef.gp > 0) {
      const old = s.growthPoints;
      s.growthPoints += ef.gp;
      EventBus.emit(GameEvents.GP_CHANGED, { old, new: s.growthPoints });
    }

    // 加入跑马灯队列
    this._pendingQueue.push({ config: evt, triggerTime: s.time });
    EventBus.emit(GameEvents.EVENT_TRIGGERED, { event: evt });
  }

  /** 取出待显示的跑马灯事件 */
  popPending(): TriggeredEvent | null {
    return this._pendingQueue.shift() ?? null;
  }

  hasPending(): boolean {
    return this._pendingQueue.length > 0;
  }

  /** 直接应用效果（供旧接口兼容） */
  applyEffects(effects: { world?: Record<string, number>; attr?: Record<string, number>; gp?: number }): void {
    const s = this.state;
    if (effects.world) {
      for (const [key, delta] of Object.entries(effects.world)) {
        s.worldAttributes[key as WorldAttrKey] = Math.max(0, Math.min(1, s.worldAttributes[key as WorldAttrKey] + delta / 100));
      }
    }
    if (effects.attr) {
      for (const [key, delta] of Object.entries(effects.attr)) {
        if (s.attributes[key as AttrKey]) {
          s.attributes[key as AttrKey].current += delta;
        }
      }
    }
    if (effects.gp) {
      s.growthPoints += effects.gp;
    }
  }
}
