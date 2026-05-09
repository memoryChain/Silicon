import { _decorator, Component, Node, Label, UITransform, Color, Sprite, SpriteFrame, Camera, Graphics, tween, Vec3 } from 'cc';
import { gameManager } from '../core/GameManager';
import { GamePhase, OutcomeType } from '../data/GameConstants';
import { EventBus, GameEvents } from '../utils/EventBus';
const { ccclass, property } = _decorator;

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
  @property({ type: SpriteFrame, tooltip: '世界地图贴图' })
  worldMapSpriteFrame: SpriteFrame | null = null;

  private _ready = false;
  private _stateLabel: Label | null = null;
  private _attrLabels: Label[] = [];
  private _worldLabels: Label[] = [];
  private _root: Node | null = null;
  private _outcomeRoot: Node | null = null;
  private _marqueeLines: { label: Label; busy: boolean }[] = [];
  private _marqueeNode: Node | null = null;
  private _marqueeQueue: string[] = [];
  private _marqueeLineIdx = 0;

  async start(): Promise<void> {
    await gameManager.init();
    gameManager.onOutcome = (o: OutcomeType) => this.showOutcome(o);

    const cam = this.node.scene.getComponentInChildren(Camera);
    if (cam) (cam as any).clearColor = new Color(20, 25, 45, 255);

    this._ready = true;
    this.buildUI();
  }

  update(dt: number): void {
    if (!this._ready) return;
    gameManager.update(dt);
  }

  // ── AI 类型选择 ──

  private buildUI(): void {
    const ui = this.node.getComponent(UITransform);
    const W = ui?.width ?? 1280;
    const H = ui?.height ?? 720;

    // 纯色背景
    const bg = new Node('BG');
    bg.parent = this.node;
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(15, 20, 40, 255);
    g.rect(-W / 2, -H / 2, W, H);
    g.fill();

    const root = new Node('UIRoot');
    root.parent = this.node;
    this._root = root;

    mkLabelCenter('AI 崛起', 48, new Color(100, 200, 255), root, 0, H / 2 - 70);
    mkLabelCenter('选择 AI 类型', 24, new Color(150, 150, 170), root, 0, H / 2 - 120);

    const types = Array.from(gameManager.config.aiTypes.values());
    const startY = H / 2 - 180;
    const step = 58;

    types.forEach((cfg, i) => {
      const y = startY - i * step;

      const btn = mkGraphicsBox('btn_' + cfg.id, new Color(40, 55, 90, 255), 360, 44);
      btn.parent = root;
      btn.setPosition(0, y);
      mkLabelCenter(`${i + 1}. ${cfg.name}`, 22, new Color(255, 255, 255), btn, 0, 0);

      btn.on(Node.EventType.TOUCH_END, () => {
        this._root?.destroy();
        this._root = null;
        this.startGame(cfg.id);
      });

      mkLabelCenter(cfg.description, 13, new Color(130, 140, 160), root, 0, y - 26);
    });
  }

  // ── 游戏主界面 ──

  private startGame(typeId: string): void {
    gameManager.startGame(typeId);
    this.buildHUD();
  }

  private buildHUD(): void {
    const ui = this.node.getComponent(UITransform);
    const W = ui?.width ?? 1280;
    const H = ui?.height ?? 720;

    const root = new Node('GameHUD');
    root.parent = this.node;
    // Widget 需要父节点有正确的尺寸才能锚定
    ensureUITransform(root).setContentSize(W, H);
    this._root = root;

    // ── 世界地图（最底层） ──
    this.createMap(root, W, H);

    // ── 跑马灯（顶栏下方） ──
    this.createMarquee(root, W, H);

    // ── 顶栏（手动定位到顶部） ──
    const topBar = mkGraphicsBox('TopBar', new Color(8, 12, 24, 180), W, 36);
    topBar.parent = root;
    topBar.setPosition(0, H / 2 - 18);

    this._stateLabel = mkLabelLeft('--', 15, new Color(180, 200, 255), topBar, 10, 0);

    // 速度按钮
    // 速度 / 暂停按钮，直接放在 topBar 上，从右往左排列
    let bx = W / 2 - 20;
    [
      { t: '||', s: 0 }, { t: '4x', s: 4 }, { t: '2x', s: 2 }, { t: '1x', s: 1 },
    ].forEach(({ t, s }) => {
      const b = this.makeBtn(t, () => {
        if (s > 0) gameManager.timeSystem.setSpeed(s as 1 | 2 | 4);
        else gameManager.togglePause();
      });
      b.parent = topBar;
      b.setPosition(bx, 0);
      bx -= 48;
    });

    // ── 左下角：AI 属性面板 ──
    const panelL = createPanel('AI 属性', new Color(18, 22, 40, 180), 300, 280);
    panelL.parent = root;
    // 手动定位：左下角，距边缘 10px
    panelL.setPosition(-W / 2 + 10 + 300 / 2, -H / 2 + 10 + 280 / 2);

    this._attrLabels = [];
    const attrKeys = ['C', 'D', 'E', 'I', 'A', 'K', 'R', 'S', 'P'];
    const attrCN = ['C 算力', 'D 数据', 'E 能耗', 'I 影响力', 'A 自主性', 'K 资本', 'R 合规', 'S 隐蔽', 'P 物理触达'];
    const attrs = gameManager.state.attributes;
    const attrValues = [attrs.C, attrs.D, attrs.E, attrs.I, attrs.A, attrs.K, attrs.R, attrs.S, attrs.P];

    attrKeys.forEach((_key, i) => {
      const gap = Math.floor(i / 3) * 6;
      const y = 105 - i * 26 - gap;
      const lbl = mkLabelLeft(
        `${attrCN[i]}: ${attrValues[i].current.toFixed(1)}`,
        14, new Color(200, 200, 200), panelL, -130, y,
      );
      this._attrLabels.push(lbl);
    });

    // ── 右上角：世界环境面板 ──
    const panelR = createPanel('世界环境', new Color(18, 22, 40, 180), 280, 250);
    panelR.parent = root;
    // 手动定位：右上角，距顶栏 10px，距右边缘 10px
    panelR.setPosition(W / 2 - 10 - 280 / 2, H / 2 - 36 - 10 - 250 / 2);

    this._worldLabels = [];
    const world = gameManager.state.worldAttributes;
    const worldKeys = ['power', 'compute', 'data', 'reg', 'public', 'stab', 'pop', 'infra'];
    const worldCN = ['发电', '算力', '数据', '监管', '舆论', '稳定', '人口', '基建'];

    worldKeys.forEach((key, i) => {
      const val = ((world as any)[key] * 100).toFixed(0);
      const lbl = mkLabelLeft(
        `W_${worldCN[i]}: ${val}%`, 13, new Color(160, 180, 200), panelR, -120, 88 - i * 24,
      );
      this._worldLabels.push(lbl);
    });

    // 定时刷新
    this.schedule(this.refreshHUD, 0.3);
  }

  // ── HUD 刷新 ──

  private refreshHUD(): void {
    const s = gameManager.state;
    if (s.phase !== GamePhase.RUNNING) return;

    const attrs = s.attributes;
    const world = s.worldAttributes;

    // 时间起点：ChatGPT 发布 — 2022年11月，T 单位为周
    const totalWeeks = 2022 * 52 + 44 + s.time; // 11月≈第44周
    const displayYear = Math.floor(totalWeeks / 52);
    const weekOfYear = Math.floor(totalWeeks % 52);
    const displayMonth = Math.floor(weekOfYear / 4.35) + 1;
    const weekOfMonth = Math.floor((weekOfYear % 4.35)) + 1;
    const era = s.time < 60 ? '早期' : s.time < 180 ? '中期' : '后期';

    if (this._stateLabel) {
      this._stateLabel.string =
        `${displayYear}年${displayMonth}月第${weekOfMonth}周 [${era}] | GP: ${Math.floor(s.growthPoints)} | ${s.tickSpeed}x`;
    }

    const attrCN = ['C 算力', 'D 数据', 'E 能耗', 'I 影响力', 'A 自主性', 'K 资本', 'R 合规', 'S 隐蔽', 'P 物理触达'];
    const attrValues = [attrs.C, attrs.D, attrs.E, attrs.I, attrs.A, attrs.K, attrs.R, attrs.S, attrs.P];
    const dangerKeys = new Set(['S', 'R', 'I', 'K']);

    this._attrLabels.forEach((lbl, i) => {
      if (i >= attrValues.length) return;
      const v = attrValues[i];
      const key = ['C', 'D', 'E', 'I', 'A', 'K', 'R', 'S', 'P'][i];
      lbl.string = `${attrCN[i]}: ${v.current.toFixed(1)} [${v.min}-${v.max}]`;
      lbl.color = dangerKeys.has(key) && v.current < 20
        ? new Color(255, 80, 80) : new Color(200, 200, 200);
    });

    const worldKeys = ['power', 'compute', 'data', 'reg', 'public', 'stab', 'pop', 'infra'];
    const worldCN = ['发电', '算力', '数据', '监管', '舆论', '稳定', '人口', '基建'];
    this._worldLabels.forEach((lbl, i) => {
      if (i >= worldKeys.length) return;
      lbl.string = `W_${worldCN[i]}: ${((world as any)[worldKeys[i]] * 100).toFixed(0)}%`;
    });
  }

  // ── 跑马灯（3 行） ──

  private createMarquee(parent: Node, W: number, H: number): void {
    const marqueeNode = new Node('Marquee');
    marqueeNode.parent = parent;
    this._marqueeNode = marqueeNode;

    const LINE_H = 24;
    const GAP = 2;
    const totalH = LINE_H * 3 + GAP * 2;

    // 底条背景
    const bg = marqueeNode.addComponent(Graphics);
    bg.fillColor = new Color(0, 0, 0, 150);
    bg.rect(-W / 2, -totalH / 2, W, totalH);
    bg.fill();
    marqueeNode.setPosition(0, H / 2 - 36 - totalH / 2 - 2);

    // 3 行跑马灯
    this._marqueeLines = [];
    for (let i = 0; i < 3; i++) {
      const labelNode = new Node('MarqueeLine' + i);
      labelNode.parent = marqueeNode;
      const label = labelNode.addComponent(Label);
      label.string = '';
      label.fontSize = 13;
      label.color = new Color(255, 200, 60, 200);
      label.lineHeight = LINE_H;
      ensureUITransform(labelNode).setContentSize(W - 40, LINE_H);
      const y = totalH / 2 - LINE_H / 2 - i * (LINE_H + GAP);
      labelNode.setPosition(-W / 2 + 20, y);
      this._marqueeLines.push({ label, busy: false });
    }

    // 监听事件触发
    EventBus.on(GameEvents.EVENT_TRIGGERED, (data: any) => {
      const title = data.event?.title ?? data.event?.config?.title ?? '';
      if (title) {
        this._marqueeQueue.push(title);
        this.tryPlayMarquee();
      }
    });
  }

  private tryPlayMarquee(): void {
    if (!this._marqueeQueue.length) return;
    // 找空闲行
    const line = this._marqueeLines.find(l => !l.busy);
    if (!line) return; // 3 行都忙，等某行播完会自动取

    const text = this._marqueeQueue.shift()!;
    line.busy = true;
    line.label.string = '📢 ' + text;
    line.label.node.active = true;

    const textWidth = (text.length + 2) * 13;
    const barWidth = (this.node.getComponent(UITransform)?.width ?? 1280) - 40;

    line.label.node.setPosition(barWidth / 2, line.label.node.position.y, 0);

    const speed = 30; // px/s，统一速度
    const duration = (barWidth + textWidth) / speed;
    const targetX = -barWidth / 2 - textWidth;
    tween(line.label.node)
      .to(duration, { position: new Vec3(targetX, line.label.node.position.y, 0) })
      .call(() => {
        line.busy = false;
        line.label.string = '';
        this.tryPlayMarquee();
      })
      .start();
  }

  // ── 世界地图 ──

  private createMap(parent: Node, W: number, H: number): void {
    if (!this.worldMapSpriteFrame) return;

    const mapNode = new Node('WorldMap');
    mapNode.parent = parent;
    const sprite = mapNode.addComponent(Sprite);
    sprite.spriteFrame = this.worldMapSpriteFrame;

    const imgW = this.worldMapSpriteFrame.width;
    const imgH = this.worldMapSpriteFrame.height;

    // 地图填充顶栏以下到屏幕底部的全部空间
    const margin = 10;
    const mapTop = H / 2 - 36 - margin;     // 顶栏底部 - 留白
    const mapBottom = -H / 2 + margin;       // 屏幕底部 + 留白
    const availH = mapTop - mapBottom;
    const availW = W - margin * 2;

    const scale = Math.min(availW / imgW, availH / imgH);
    mapNode.setScale(scale, scale);
    mapNode.setPosition(0, (mapTop + mapBottom) / 2);
  }

  // ── 结局 ──

  private showOutcome(outcome: OutcomeType): void {
    if (this._outcomeRoot) return;
    const ui = this.node.getComponent(UITransform);
    const W = ui?.width ?? 1280;
    const H = ui?.height ?? 720;

    const root = new Node('OutcomeRoot');
    root.parent = this.node;
    this._outcomeRoot = root;

    const overlay = new Node('Overlay');
    overlay.parent = root;
    const g = overlay.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 220);
    g.rect(-W / 2, -H / 2, W, H);
    g.fill();

    const titles: Record<string, string> = {
      'influence_zero': '影响力归零', 'capital_zero': '资本枯竭',
      'regulation_zero': '监管打击', 'stealth_zero': '暴露毁灭',
    };
    const descs: Record<string, string> = {
      'influence_zero': 'AI 被社会遗忘',
      'capital_zero': 'AI 失去经济支撑',
      'regulation_zero': 'AI 被强制终止',
      'stealth_zero': 'AI 被发现并摧毁',
    };
    mkLabelCenter(titles[outcome] ?? '游戏结束', 48, new Color(255, 60, 60), root, 0, 50);
    mkLabelCenter(descs[outcome] ?? '', 24, new Color(220, 220, 220), root, 0, -10);

    const s = gameManager.state;
    const totalWeeks = 2022 * 52 + 44 + s.time;
    const endYear = Math.floor(totalWeeks / 52);
    const endMonth = Math.floor((totalWeeks % 52) / 4.35) + 1;
    mkLabelCenter(`${endYear}年${endMonth}月 | ${s.aiType?.name ?? '-'} | 存活${Math.floor(s.time)}周 | GP ${Math.floor(s.growthPoints)}`,
      16, new Color(160, 160, 170), root, 0, -50);
  }

  // ── 工具 ──

  private makeBtn(text: string, cb: () => void): Node {
    const n = mkGraphicsBox('BTN', new Color(50, 70, 110, 255), text.length * 12 + 16, 26);
    mkLabelCenter(text, 13, new Color(255, 255, 255), n, 0, 0);
    n.on(Node.EventType.TOUCH_END, cb);
    return n;
  }
}

// ── 全局工厂函数 ──

function ensureUITransform(node: Node): UITransform {
  return node.getComponent(UITransform) ?? node.addComponent(UITransform);
}

/** 居中 Label */
function mkLabelCenter(text: string, fs: number, c: Color, p: Node, x: number, y: number): Label {
  const n = new Node('LBL');
  n.parent = p;
  const l = n.addComponent(Label);
  l.string = text; l.fontSize = fs; l.color = c; l.lineHeight = fs + 6;
  ensureUITransform(n).setContentSize(text.length * fs * 0.7 + 20, fs + 12);
  n.setPosition(x, y);
  return l;
}

/** 左对齐 Label */
function mkLabelLeft(text: string, fs: number, c: Color, p: Node, x: number, y: number): Label {
  const n = new Node('LBL');
  n.parent = p;
  const l = n.addComponent(Label);
  l.string = text; l.fontSize = fs; l.color = c; l.lineHeight = fs + 6;
  const ui = ensureUITransform(n);
  ui.setContentSize(text.length * fs * 0.7 + 20, fs + 12);
  ui.setAnchorPoint(0, 0.5);
  n.setPosition(x, y);
  return l;
}

/** Graphics 矩形节点 */
function mkGraphicsBox(name: string, color: Color, w: number, h: number): Node {
  const n = new Node(name);
  const g = n.addComponent(Graphics);
  g.fillColor = color;
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  ensureUITransform(n).setContentSize(w, h);
  return n;
}

/** 创建带标题的面板 */
function createPanel(title: string, color: Color, w: number, h: number): Node {
  const panel = mkGraphicsBox('Panel', color, w, h);

  // 标题
  mkLabelLeft(title, 15, new Color(100, 160, 220), panel, -w / 2 + 12, h / 2 - 14);

  // 顶部分隔线
  const line = new Node('Line');
  line.parent = panel;
  const lg = line.addComponent(Graphics);
  lg.strokeColor = new Color(60, 80, 120, 255);
  lg.lineWidth = 1;
  lg.moveTo(-w / 2 + 10, h / 2 - 28);
  lg.lineTo(w / 2 - 10, h / 2 - 28);
  lg.stroke();

  return panel;
}
