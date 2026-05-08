import { GameState } from './GameState';
import { ConfigManager } from './ConfigManager';
import { AITypeConfig } from '../data/AITypeData';
import { DEFAULT_GP_WEIGHTS } from '../data/GameConstants';

/** AI 类型系统 —— 管理 AI 类型选择与初始值注入 */
export class AITypeSystem {
  private state: GameState;
  private config: ConfigManager;

  constructor(state: GameState, config: ConfigManager) {
    this.state = state;
    this.config = config;
  }

  /** 获取所有可选的 AI 类型 */
  getAvailableTypes(): AITypeConfig[] {
    return Array.from(this.config.aiTypes.values());
  }

  /** 选择 AI 类型并注入初始值 */
  selectType(typeId: string): boolean {
    const typeConfig = this.config.aiTypes.get(typeId);
    if (!typeConfig) return false;

    this.state.applyAIType(typeConfig);
    this.state.growthPoints = 50; // 初始赠送

    return true;
  }
}
