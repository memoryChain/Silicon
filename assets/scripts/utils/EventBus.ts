import { EventTarget } from 'cc';

/** 全局事件总线，连接逻辑层与 UI 层 */
export const EventBus = new EventTarget();

// ── 事件名常量 ──
export const GameEvents = {
  // Tick 生命周期
  TICK_BEFORE: 'tick:before',
  TICK_AFTER: 'tick:after',
  TICK_LAYER1: 'tick:layer1',
  TICK_LAYER2: 'tick:layer2',
  TICK_LAYER3: 'tick:layer3',

  // 属性变化
  ATTR_CHANGED: 'attr:changed',
  WORLD_CHANGED: 'world:changed',

  // 游戏状态
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_SPEED_CHANGE: 'game:speed_change',
  GAME_OUTCOME: 'game:outcome',

  // 时代变化
  ERA_CHANGED: 'era:changed',

  // 技能与成长
  SKILL_UNLOCKED: 'skill:unlocked',
  GP_CHANGED: 'gp:changed',

  // 事件
  EVENT_TRIGGERED: 'event:triggered',
  EVENT_CHOICE: 'event:choice',
} as const;
