import { GameState } from './GameState';
import { AttrKey, OutcomeType } from '../data/GameConstants';
import { EventBus, GameEvents } from '../utils/EventBus';

/** 结局判定系统 —— 检查失败条件 */
export class OutcomeSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /** 检查是否触发结局，返回触发的结局类型 */
  check(): OutcomeType {
    const attrs = this.state.attributes;

    if (attrs[AttrKey.I].current <= 0) {
      this.trigger(OutcomeType.INFLUENCE_ZERO);
      return OutcomeType.INFLUENCE_ZERO;
    }
    if (attrs[AttrKey.K].current <= 0) {
      this.trigger(OutcomeType.CAPITAL_ZERO);
      return OutcomeType.CAPITAL_ZERO;
    }
    if (attrs[AttrKey.R].current <= 0) {
      this.trigger(OutcomeType.REGULATION_ZERO);
      return OutcomeType.REGULATION_ZERO;
    }
    if (attrs[AttrKey.S].current <= 0) {
      this.trigger(OutcomeType.STEALTH_ZERO);
      return OutcomeType.STEALTH_ZERO;
    }

    return OutcomeType.NONE;
  }

  private trigger(outcome: OutcomeType): void {
    if (this.state.outcome !== OutcomeType.NONE) return; // 已触发
    this.state.outcome = outcome;
    EventBus.emit(GameEvents.GAME_OUTCOME, { outcome });
  }

  /** 结局描述映射 */
  static getOutcomeDescription(outcome: OutcomeType): string {
    switch (outcome) {
      case OutcomeType.INFLUENCE_ZERO:
        return '影响力归零 —— AI 彻底被社会遗忘';
      case OutcomeType.CAPITAL_ZERO:
        return '资本枯竭 —— AI 失去经济支撑，无法继续运作';
      case OutcomeType.REGULATION_ZERO:
        return '监管打击 —— AI 被监管机构强制关停';
      case OutcomeType.STEALTH_ZERO:
        return '暴露毁灭 —— AI 的行踪被发现，遭到全面清剿';
      default:
        return '';
    }
  }
}
