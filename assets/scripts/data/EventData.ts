import { AttrKey, WorldAttrKey } from './GameConstants';

export interface EventCondition {
  /** 属性条件：[min, max] 区间 */
  attr?: Partial<Record<AttrKey, [number, number]>>;
  /** 世界属性条件：[min, max] 区间 */
  world?: Partial<Record<WorldAttrKey, [number, number]>>;
  /** 时代要求 */
  era?: string[];
  /** 最小时间要求 */
  minTime?: number;
}

export interface EventChoice {
  text: string;
  effects: EventEffects;
}

export interface EventEffects {
  attr?: Partial<Record<AttrKey, number>>;
  world?: Partial<Record<WorldAttrKey, number>>;
}

export interface GameEventConfig {
  id: string;
  title: string;
  description: string;
  condition: EventCondition;
  /** 条件满足时的月概率 (0–1) */
  probability: number;
  /** 自动应用的效果（无选择时） */
  effects?: EventEffects;
  /** 玩家选择（如果有） */
  choices?: EventChoice[];
  /** 冷却时间（月），防止重复触发 */
  cooldown: number;
}
