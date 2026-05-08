import { GameState } from './GameState';
import { AttrKey, LAYER1_KEYS, LAYER2_KEYS, LAYER3_KEYS } from '../data/GameConstants';
import { FormulaEngine } from '../utils/FormulaEngine';
import { EventBus, GameEvents } from '../utils/EventBus';
import { clamp } from '../utils/MathUtils';
import { ClampedValue } from '../data/AttributeData';

/**
 * 属性系统 —— 按三层顺序更新属性值
 */
export class AttributeSystem {
  private state: GameState;
  private engine: FormulaEngine;

  constructor(state: GameState, engine: FormulaEngine) {
    this.state = state;
    this.engine = engine;
  }

  /** 执行所有属性的更新 */
  updateAll(dt: number): void {
    const norm = this.state.normalized;
    const world = this.state.worldAttributes;
    const mults = this.state.multiplierSnapshot;

    // 严格按层更新
    this.updateLayer(LAYER1_KEYS, norm, world, mults, dt);
    EventBus.emit(GameEvents.TICK_LAYER1);

    // Layer 1 更新后需重新归一化
    const normAfterL1 = this.state.normalized;
    this.updateLayer(LAYER2_KEYS, normAfterL1, world, mults, dt);
    EventBus.emit(GameEvents.TICK_LAYER2);

    const normAfterL2 = this.state.normalized;
    this.updateLayer(LAYER3_KEYS, normAfterL2, world, mults, dt);
    EventBus.emit(GameEvents.TICK_LAYER3);

    // Clamp 所有值
    this.clampAll();
  }

  private updateLayer(
    keys: AttrKey[],
    norm: Record<string, number>,
    world: Record<string, number>,
    mults: Record<string, number>,
    dt: number,
  ): void {
    for (const key of keys) {
      const delta = this.engine.computeDelta(key, norm, world, mults, dt);
      const attr = this.state.attributes[key];
      const oldVal = attr.current;
      attr.current += delta;

      if (Math.abs(attr.current - oldVal) > 0.001) {
        EventBus.emit(GameEvents.ATTR_CHANGED, {
          name: key,
          old: oldVal,
          new: attr.current,
        });
      }
    }
  }

  private clampAll(): void {
    for (const key of Object.values(AttrKey)) {
      const attr: ClampedValue = this.state.attributes[key];
      attr.current = clamp(attr.current, attr.min, attr.max);
    }
  }
}
