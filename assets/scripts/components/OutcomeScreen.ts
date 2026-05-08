import { _decorator, Component, Label } from 'cc';
import { OutcomeType } from '../data/GameConstants';
import { OutcomeSystem } from '../core/OutcomeSystem';
import { GameState } from '../core/GameState';
const { ccclass, property } = _decorator;

/**
 * 结局画面 —— 显示结局描述和统计数据
 */
@ccclass('OutcomeScreen')
export class OutcomeScreen extends Component {
  @property(Label) outcomeTitle: Label | null = null;
  @property(Label) outcomeDesc: Label | null = null;
  @property(Label) statsLabel: Label | null = null;

  showOutcome(outcome: OutcomeType): void {
    const state = GameState.instance;

    if (this.outcomeTitle) {
      const titleMap: Record<string, string> = {
        [OutcomeType.INFLUENCE_ZERO]: '影响力归零',
        [OutcomeType.CAPITAL_ZERO]: '资本枯竭',
        [OutcomeType.REGULATION_ZERO]: '监管打击',
        [OutcomeType.STEALTH_ZERO]: '暴露毁灭',
      };
      this.outcomeTitle.string = titleMap[outcome] ?? '游戏结束';
    }

    if (this.outcomeDesc) {
      this.outcomeDesc.string = OutcomeSystem.getOutcomeDescription(outcome);
    }

    if (this.statsLabel) {
      const years = Math.floor(state.time / 12);
      const months = Math.floor(state.time % 12);
      this.statsLabel.string =
        `存活时间: ${years}年${months}月\n` +
        `AI 类型: ${state.aiType?.name ?? '未知'}\n` +
        `已解锁技能: ${state.unlockedSkills.size}\n` +
        `成长点数: ${Math.floor(state.growthPoints)}`;
    }
  }
}
