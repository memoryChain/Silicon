import { _decorator, Component, Label, Node } from 'cc';
import { EventBus, GameEvents } from '../utils/EventBus';
import { GameEventConfig } from '../data/EventData';
import { gameManager } from '../core/GameManager';
const { ccclass, property } = _decorator;

/**
 * 事件弹窗 —— 显示事件内容和玩家选择
 */
@ccclass('EventPopup')
export class EventPopup extends Component {
  @property(Label) titleLabel: Label | null = null;
  @property(Label) descLabel: Label | null = null;
  @property(Node) choicesContainer: Node | null = null;
  @property(Label) choice1Label: Label | null = null;
  @property(Label) choice2Label: Label | null = null;

  private _currentEvent: GameEventConfig | null = null;

  onLoad(): void {
    EventBus.on(GameEvents.EVENT_TRIGGERED, this.onEventTriggered, this);
    gameManager.onEvent = (evt) => {
      this.show(evt);
    };
  }

  onDestroy(): void {
    EventBus.off(GameEvents.EVENT_TRIGGERED, this.onEventTriggered, this);
  }

  private onEventTriggered(data: { event: GameEventConfig }): void {
    this.show(data.event);
  }

  show(evt: GameEventConfig): void {
    this._currentEvent = evt;
    this.node.active = true;

    if (this.titleLabel) this.titleLabel.string = evt.title;
    if (this.descLabel) this.descLabel.string = evt.description;

    const hasChoices = evt.choices && evt.choices.length > 0;

    if (this.choicesContainer) {
      this.choicesContainer.active = hasChoices;
    }

    if (hasChoices) {
      if (this.choice1Label && evt.choices![0]) {
        this.choice1Label.string = evt.choices![0].text;
      }
      if (this.choice2Label && evt.choices![1]) {
        this.choice2Label.string = evt.choices![1].text;
      }
    }

    // 无选择：自动应用效果
    if (!hasChoices && evt.effects) {
      gameManager.eventSystem.applyEffects(evt.effects);
      this.scheduleOnce(() => { this.node.active = false; }, 2);
    }
  }

  /** 玩家选择 */
  onChoose(index: number): void {
    if (!this._currentEvent) return;
    gameManager.resolveEvent(this._currentEvent.id, index);
    this.node.active = false;
  }
}
