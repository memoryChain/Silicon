import { GameState } from './GameState';
import { WorldAttrKey, ALL_WORLD_KEYS } from '../data/GameConstants';
import { ConfigManager } from './ConfigManager';
import { EventBus, GameEvents } from '../utils/EventBus';
import { clamp01 } from '../utils/MathUtils';

/** 世界属性系统 —— 管理世界属性随时代的漂移 */
export class WorldAttributeSystem {
  private state: GameState;
  private config: ConfigManager;

  constructor(state: GameState, config: ConfigManager) {
    this.state = state;
    this.config = config;
  }

  /** 根据当前时代漂移所有世界属性 */
  drift(era: string, dt: number): void {
    const driftRates = this.config.getEraDrift(era);
    if (!driftRates) return;

    for (const key of ALL_WORLD_KEYS) {
      const rate = driftRates[key] ?? 0;
      if (rate === 0) continue;

      const oldVal = this.state.worldAttributes[key];
      this.state.worldAttributes[key] = clamp01(oldVal + rate * dt);

      if (Math.abs(this.state.worldAttributes[key] - oldVal) > 0.0001) {
        EventBus.emit(GameEvents.WORLD_CHANGED, {
          name: key,
          old: oldVal,
          new: this.state.worldAttributes[key],
        });
      }
    }
  }

  /** 获取世界属性值 */
  get(key: WorldAttrKey): number {
    return this.state.worldAttributes[key];
  }
}
