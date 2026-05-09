import { GameState } from './GameState';
import { Era, ERA_BOUNDARIES_WEEKS, GameSpeed } from '../data/GameConstants';
import { EventBus, GameEvents } from '../utils/EventBus';

/** 时间系统 —— T 单调递增（单位：周），时代判定 */
export class TimeSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /** 执行一次 tick，返回 Δt（周） */
  tick(realDt: number): number {
    const dt = realDt * this.state.tickSpeed; // 1 tick = 1 周
    const oldEra = this.getEra();
    this.state.time += dt;

    const newEra = this.getEra();
    if (newEra !== oldEra) {
      EventBus.emit(GameEvents.ERA_CHANGED, { from: oldEra, to: newEra });
    }

    return dt;
  }

  /** 获取当前时代（基于周数） */
  getEra(): Era {
    const t = this.state.time;
    for (const b of ERA_BOUNDARIES_WEEKS) {
      if (t >= b.min && t < b.max) return b.era;
    }
    return Era.LATE;
  }

  /** 设置倍速 */
  setSpeed(speed: GameSpeed): void {
    this.state.tickSpeed = speed;
    EventBus.emit(GameEvents.GAME_SPEED_CHANGE, { speed });
  }
}
