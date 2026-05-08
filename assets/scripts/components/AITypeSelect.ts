import { _decorator, Component, Node, Label, Prefab, instantiate } from 'cc';
import { AITypeConfig } from '../data/AITypeData';
import { AITypeSystem } from '../core/AITypeSystem';
import { gameManager } from '../core/GameManager';
const { ccclass, property } = _decorator;

/**
 * AI 类型选择界面 —— 列出 7 种 AI 类型供选择
 */
@ccclass('AITypeSelect')
export class AITypeSelect extends Component {
  @property(Node) buttonContainer: Node | null = null;
  @property(Prefab) typeButtonPrefab: Prefab | null = null;

  onEnable(): void {
    this.buildTypeList();
  }

  private buildTypeList(): void {
    if (!this.buttonContainer) return;
    this.buttonContainer.removeAllChildren();

    const types = gameManager.config.aiTypes;
    types.forEach((config: AITypeConfig) => {
      const btnNode = this.typeButtonPrefab
        ? instantiate(this.typeButtonPrefab)
        : this.createSimpleButton(config);
      btnNode.parent = this.buttonContainer;

      const label = btnNode.getComponentInChildren(Label);
      if (label) {
        label.string = `${config.name}\n${config.description}`;
      }

      // 绑定点击
      btnNode.on(Node.EventType.TOUCH_END, () => {
        this.onSelectType(config.id);
      });
    });
  }

  /** 简化版：纯代码创建按钮 */
  private createSimpleButton(config: AITypeConfig): Node {
    const node = new Node(config.name);
    node.addComponent(Label);
    return node;
  }

  private onSelectType(typeId: string): void {
    const root = this.node.parent?.getComponent('GameRoot');
    if (root && (root as any).selectAIType) {
      (root as any).selectAIType(typeId);
    }
  }
}
