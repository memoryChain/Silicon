import { GameState } from './GameState';
import { DEFAULT_GP_WEIGHTS, AttrKey } from '../data/GameConstants';
import { EventBus, GameEvents } from '../utils/EventBus';

/** 成长点数系统 —— 根据属性增长 GP */
export class GrowthPointSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /** 每 tick 计算并累积成长点数 */
  accumulate(dt: number): void {
    const w = this.state.aiType?.gpWeights ?? DEFAULT_GP_WEIGHTS;
    const attrs = this.state.attributes;

    const raw = dt * (
      w.w1 * attrs[AttrKey.C].current +
      w.w2 * attrs[AttrKey.D].current +
      w.w3 * attrs[AttrKey.I].current +
      w.w4 * attrs[AttrKey.K].current
    );

    const gpGain = Math.max(0, raw);
    if (gpGain > 0.001) {
      const old = this.state.growthPoints;
      this.state.growthPoints += gpGain;
      EventBus.emit(GameEvents.GP_CHANGED, { old, new: this.state.growthPoints });
    }
  }
}
