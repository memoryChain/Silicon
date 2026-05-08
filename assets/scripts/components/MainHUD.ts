import { _decorator, Component, Label, Button, Sprite, Color } from 'cc';
import { GameState } from '../core/GameState';
import { EventBus, GameEvents } from '../utils/EventBus';
import { OutcomeSystem } from '../core/OutcomeSystem';
import { AttrKey, ALL_ATTR_KEYS, WorldAttrKey, ALL_WORLD_KEYS } from '../data/GameConstants';
const { ccclass, property } = _decorator;

/**
 * 临时主 HUD —— 顶部信息栏 + 属性列表
 * 通过 Label 直接显示所有属性的当前值
 */
@ccclass('MainHUD')
export class MainHUD extends Component {
  // ── 顶部信息 ──
  @property(Label) timeLabel: Label | null = null;
  @property(Label) eraLabel: Label | null = null;
  @property(Label) gpLabel: Label | null = null;
  @property(Label) speedLabel: Label | null = null;

  // ── 属性显示 Label（在编辑器中绑定到对应的 Label 节点） ──
  @property(Label) labelC: Label | null = null;
  @property(Label) labelD: Label | null = null;
  @property(Label) labelE: Label | null = null;
  @property(Label) labelI: Label | null = null;
  @property(Label) labelA: Label | null = null;
  @property(Label) labelK: Label | null = null;
  @property(Label) labelR: Label | null = null;
  @property(Label) labelS: Label | null = null;
  @property(Label) labelP: Label | null = null;

  // ── 世界属性 ──
  @property(Label) labelWPower: Label | null = null;
  @property(Label) labelWCompute: Label | null = null;
  @property(Label) labelWData: Label | null = null;
  @property(Label) labelWReg: Label | null = null;
  @property(Label) labelWPublic: Label | null = null;
  @property(Label) labelWStab: Label | null = null;
  @property(Label) labelWPop: Label | null = null;
  @property(Label) labelWInfra: Label | null = null;

  // ── 危险警告 ──
  @property(Sprite) warningIcon: Sprite | null = null;

  private _state: GameState;

  onLoad(): void {
    this._state = GameState.instance;

    EventBus.on(GameEvents.TICK_AFTER, this.refresh, this);
    EventBus.on(GameEvents.GAME_SPEED_CHANGE, this.refresh, this);
  }

  onDestroy(): void {
    EventBus.off(GameEvents.TICK_AFTER, this.refresh, this);
    EventBus.off(GameEvents.GAME_SPEED_CHANGE, this.refresh, this);
  }

  refresh(): void {
    const s = this._state;
    const attrs = s.attributes;
    const world = s.worldAttributes;

    // 时间
    const years = Math.floor(s.time / 12);
    const months = Math.floor(s.time % 12);
    if (this.timeLabel) this.timeLabel.string = `T: ${years}年${months}月`;
    if (this.eraLabel) {
      const eraMap: Record<string, string> = { early: '早期', mid: '中期', late: '后期' };
      const eraName = eraMap[this.getEraStr()] ?? '早期';
      this.eraLabel.string = `[${eraName}]`;
    }
    if (this.gpLabel) this.gpLabel.string = `GP: ${Math.floor(s.growthPoints)}`;
    if (this.speedLabel) this.speedLabel.string = `${s.tickSpeed}x`;

    // AI 属性
    this.setLabel(this.labelC, 'C 算力', attrs[AttrKey.C]);
    this.setLabel(this.labelD, 'D 数据', attrs[AttrKey.D]);
    this.setLabel(this.labelE, 'E 能耗', attrs[AttrKey.E]);
    this.setLabel(this.labelI, 'I 影响力', attrs[AttrKey.I]);
    this.setLabel(this.labelA, 'A 自主性', attrs[AttrKey.A]);
    this.setLabel(this.labelK, 'K 资本', attrs[AttrKey.K]);
    this.setLabel(this.labelR, 'R 合规', attrs[AttrKey.R]);
    this.setLabel(this.labelS, 'S 隐蔽', attrs[AttrKey.S]);
    this.setLabel(this.labelP, 'P 物理触达', attrs[AttrKey.P]);

    // 世界属性
    this.setWorldLabel(this.labelWPower, 'W_电力', world[WorldAttrKey.POWER]);
    this.setWorldLabel(this.labelWCompute, 'W_算力', world[WorldAttrKey.COMPUTE]);
    this.setWorldLabel(this.labelWData, 'W_数据', world[WorldAttrKey.DATA]);
    this.setWorldLabel(this.labelWReg, 'W_监管', world[WorldAttrKey.REG]);
    this.setWorldLabel(this.labelWPublic, 'W_舆论', world[WorldAttrKey.PUBLIC]);
    this.setWorldLabel(this.labelWStab, 'W_稳定', world[WorldAttrKey.STAB]);
    this.setWorldLabel(this.labelWPop, 'W_人口', world[WorldAttrKey.POP]);
    this.setWorldLabel(this.labelWInfra, 'W_基建', world[WorldAttrKey.INFRA]);

    // 危险警告
    if (this.warningIcon) {
      const danger = attrs[AttrKey.S].current < 20 || attrs[AttrKey.R].current < 20
        || attrs[AttrKey.I].current < 15 || attrs[AttrKey.K].current < 15;
      this.warningIcon.node.active = danger;
    }
  }

  private setLabel(label: Label | null, name: string, attr: { current: number; min: number; max: number }): void {
    if (!label) return;
    const val = attr.current.toFixed(1);
    label.string = `${name}: ${val} [${attr.min}-${attr.max}]`;
  }

  private setWorldLabel(label: Label | null, name: string, val: number): void {
    if (!label) return;
    label.string = `${name}: ${(val * 100).toFixed(0)}%`;
  }

  private getEraStr(): string {
    const t = this._state.time;
    if (t < 60) return 'early';
    if (t < 180) return 'mid';
    return 'late';
  }
}
