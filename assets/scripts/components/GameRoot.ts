import { _decorator, Component, Node } from 'cc';
import { gameManager } from '../core/GameManager';
import { GamePhase, OutcomeType } from '../data/GameConstants';
const { ccclass, property } = _decorator;

/**
 * GameRoot — 挂载在 Game 场景根节点
 * 负责初始化 GameManager 并驱动 update
 */
@ccclass('GameRoot')
export class GameRoot extends Component {
  @property(Node) aiSelectScreen: Node | null = null;
  @property(Node) mainHUD: Node | null = null;
  @property(Node) outcomeScreen: Node | null = null;

  private _initialized = false;

  async start(): Promise<void> {
    // 加载配置
    await gameManager.init();

    // 设置回调
    gameManager.onOutcome = (outcome: OutcomeType) => {
      this.showOutcome(outcome);
    };

    // 显示 AI 选择界面
    this.showAISelect();
    this._initialized = true;
  }

  update(dt: number): void {
    if (this._initialized) {
      gameManager.update(dt);
    }
  }

  /** 选择 AI 类型并开始 */
  selectAIType(typeId: string): void {
    gameManager.startGame(typeId);
    if (this.aiSelectScreen) this.aiSelectScreen.active = false;
    if (this.mainHUD) this.mainHUD.active = true;
  }

  private showAISelect(): void {
    if (this.aiSelectScreen) this.aiSelectScreen.active = true;
    if (this.mainHUD) this.mainHUD.active = false;
    if (this.outcomeScreen) this.outcomeScreen.active = false;
  }

  private showOutcome(outcome: OutcomeType): void {
    if (this.mainHUD) this.mainHUD.active = false;
    if (this.outcomeScreen) {
      this.outcomeScreen.active = true;
      const comp = this.outcomeScreen.getComponent('OutcomeScreen');
      if (comp && (comp as any).showOutcome) {
        (comp as any).showOutcome(outcome);
      }
    }
  }

  /** 暂停/恢复 */
  onTogglePause(): void {
    gameManager.togglePause();
  }

  /** 设置速度 */
  onSetSpeed(speed: number): void {
    gameManager.timeSystem.setSpeed(speed as 1 | 2 | 4);
  }
}
