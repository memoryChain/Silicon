import { Node, Graphics, Color } from 'cc';
import { GameState } from '../core/GameState';
import { GamePhase } from '../data/GameConstants';
import { CityNode } from '../data/CityData';

export interface CitiesConfig {
  countries: { id: string; name: string; continent: string }[];
  cities: CityNode[];
}

// 控制状态：0=无, 1=反对(红), 2=争议(黄), 3=发展(绿), 4=掌控(蓝)
type ControlStatus = 0 | 1 | 2 | 3 | 4;

const STATUS_COLORS: Record<number, { fill: Color; stroke: Color }> = {
  1: { fill: new Color(200, 50, 40, 160),  stroke: new Color(255, 80, 60, 220) },   // 红-反对
  2: { fill: new Color(200, 160, 20, 160),  stroke: new Color(255, 210, 30, 220) },   // 黄-争议
  3: { fill: new Color(40, 180, 80, 160),   stroke: new Color(60, 230, 100, 220) },   // 绿-发展
  4: { fill: new Color(30, 140, 220, 160),  stroke: new Color(60, 190, 255, 220) },   // 蓝-掌控
};

// ── 覆盖层类 ──

export class WorldMapOverlay {
  private _gfx: Graphics;
  private _cities: CityNode[];
  private _activeMask: boolean[];
  private _statuses: ControlStatus[];        // 每个节点的控制状态
  private _activeTimer: number[];
  private _glowPhases: number[];
  private _particles: { from: number; to: number; progress: number; speed: number }[] = [];
  private _particleCount = 600;
  private _backboneParticleCount = 150;
  private _neighborCache: Map<number, number[]> = new Map(); // 预计算邻居
  private _time = 0;
  private _dt = 0.016;
  private _frameSkip = 0;

  // 调试模式
  private _debugFull = true;
  private _debugDemoMode = 0; // 0=混合, 1=全反对, 2=全争议, 3=全发展, 4=全掌控
  private _hiddenContinents: Set<string> = new Set(); // 隐藏的大洲

  private _gridSize = 10;
  private _spatialGrid: number[][] = [];

  constructor(parent: Node, _mapW: number, _mapH: number, cfg: CitiesConfig) {
    const node = new Node('MapOverlay');
    node.parent = parent;
    this._gfx = node.addComponent(Graphics);

    this._cities = cfg.cities;
    const n = this._cities.length;
    this._activeMask = new Array(n).fill(false);
    this._statuses = new Array(n).fill(0);
    this._activeTimer = new Array(n).fill(0);
    this._glowPhases = this._cities.map(() => Math.random() * Math.PI * 2);

    for (let i = 0; i < this._particleCount; i++) {
      this._particles.push({ from: 0, to: 1, progress: Math.random(), speed: 0.1 + Math.random() * 0.4 });
    }

    this.buildSpatialGrid();
  }

  private buildSpatialGrid(): void {
    const g = this._gridSize;
    this._spatialGrid = Array.from({ length: g * g }, () => []);
    for (let i = 0; i < this._cities.length; i++) {
      const c = this._cities[i];
      const gx = Math.min(g - 1, Math.floor(c.nx * g));
      const gy = Math.min(g - 1, Math.floor(c.ny * g));
      this._spatialGrid[gy * g + gx].push(i);
    }
    // 预计算所有邻居（只算一次）
    for (let i = 0; i < this._cities.length; i++) {
      this._neighborCache.set(i, this.calcNeighbors(i));
    }
  }

  private calcNeighbors(idx: number): number[] {
    const c = this._cities[idx];
    const g = this._gridSize;
    const cx = Math.floor(c.nx * g);
    const cy = Math.floor(c.ny * g);
    const result: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx >= 0 && gx < g && gy >= 0 && gy < g) {
          for (const ni of this._spatialGrid[gy * g + gx]) {
            if (ni > idx && Math.hypot(this._cities[ni].nx - c.nx, this._cities[ni].ny - c.ny) < 0.06) {
              result.push(ni);
            }
          }
        }
      }
    }
    return result;
  }

  private getNeighbors(idx: number): number[] {
    return this._neighborCache.get(idx) || [];
  }

  // ── 调试按钮 ──

  /** 切换调试演示模式 */
  cycleDebugMode(): string {
    this._debugDemoMode = (this._debugDemoMode + 1) % 6;
    const names = ['混合', '全反对(红)', '全争议(黄)', '全发展(绿)', '全掌控(蓝)', '仅蓝点'];
    return names[this._debugDemoMode];
  }

  toggleDebug(): boolean {
    this._debugFull = !this._debugFull;
    return this._debugFull;
  }

  /** 获取所有大洲列表 */
  getContinents(): string[] {
    const set = new Set<string>();
    for (const c of this._cities) if (c.continent) set.add(c.continent);
    return [...set].sort();
  }

  /** 切换大洲显示 */
  toggleContinent(continent: string): boolean {
    if (this._hiddenContinents.has(continent)) {
      this._hiddenContinents.delete(continent);
      return true; // 现在显示
    } else {
      this._hiddenContinents.add(continent);
      return false; // 现在隐藏
    }
  }

  /** 大洲是否可见 */
  isContinentVisible(continent: string): boolean {
    return !this._hiddenContinents.has(continent);
  }

  // ── 主更新 ──

  update(dt: number, state: GameState): void {
    if (state.phase !== GamePhase.RUNNING) return;
    this._time += dt;
    this._dt = dt;
    // 隔帧渲染，减半 GPU 负载
    this._frameSkip = (this._frameSkip + 1) % 2;
    if (this._frameSkip !== 0) return;

    if (this._debugFull) {
      // 只激活可见大洲的节点
      for (let i = 0; i < this._cities.length; i++) {
        const cont = this._cities[i].continent || '';
        this._activeMask[i] = cont === '' || !this._hiddenContinents.has(cont);
      }
      this._applyDebugDemo();
      this.render();
      return;
    }

    // 正式逻辑：P 控制激活，I+时间控制状态
    const attrs = state.attributes;
    const total = this._cities.length;
    const pNorm = attrs.P.current / 100;
    const iNorm = attrs.I.current / 100;
    const targetActive = Math.floor(pNorm * total);
    const activeNow = this._activeMask.filter(Boolean).length;

    // 累积激活时间 & 状态升级
    for (let i = 0; i < total; i++) {
      if (this._activeMask[i]) {
        this._activeTimer[i] += dt;
        if (iNorm < 0.2) {
          this._statuses[i] = 1; // 反对
        } else if (iNorm < 0.4) {
          this._statuses[i] = this._activeTimer[i] > 20 ? 2 : 1; // 时间够→争议
        } else if (iNorm < 0.6) {
          this._statuses[i] = this._activeTimer[i] > 20 ? 3 : 2; // 时间够→发展
        } else {
          this._statuses[i] = this._activeTimer[i] > 30 ? 4 : 3; // 时间够→掌控
        }
      } else {
        this._activeTimer[i] = 0;
        this._statuses[i] = 0;
      }
    }

    // 激活新节点
    if (activeNow < targetActive) {
      const available = this._cities
        .map((c, i) => ({ i, c }))
        .filter(({ i }) => !this._activeMask[i])
        .sort((a, b) => a.c.tier - b.c.tier);
      const count = Math.min(3, targetActive - activeNow);
      for (let k = 0; k < count && k < available.length; k++) {
        this._activeMask[available[k].i] = true;
        this._glowPhases[available[k].i] = this._time;
      }
    }

    this.render();
  }

  private _applyDebugDemo(): void {
    const n = this._cities.length;
    switch (this._debugDemoMode) {
      case 0: // 混合：随机分配 4 种状态
        for (let i = 0; i < n; i++) this._statuses[i] = (1 + (i % 4)) as ControlStatus;
        break;
      case 1: for (let i = 0; i < n; i++) this._statuses[i] = 1; break;
      case 2: for (let i = 0; i < n; i++) this._statuses[i] = 2; break;
      case 3: for (let i = 0; i < n; i++) this._statuses[i] = 3; break;
      case 4: for (let i = 0; i < n; i++) this._statuses[i] = 4; break;
      case 5: for (let i = 0; i < n; i++) this._statuses[i] = 0; break;
    }
  }

  // 跨洲光缆骨干线（城市 id 对）
  private _backbonePairs: [string, string][] = [
    ['sf', 'tk'],   // 旧金山 ←→ 东京（跨太平洋）
    ['la', 'tk'],   // 洛杉矶 ←→ 东京
    ['sf', 'sh'],   // 旧金山 ←→ 上海
    ['ny', 'lon'],  // 纽约 ←→ 伦敦（跨大西洋）
    ['bo', 'lon'],  // 波士顿 ←→ 伦敦
    ['sh', 'sgp'],  // 上海 ←→ 新加坡
    ['tk', 'sgp'],  // 东京 ←→ 新加坡
    ['sgp', 'mum'], // 新加坡 ←→ 孟买
    ['mum', 'dub'], // 孟买 ←→ 迪拜
    ['dub', 'lon'], // 迪拜 ←→ 伦敦
    ['dub', 'ist'], // 迪拜 ←→ 伊斯坦布尔
    ['lon', 'par'], // 伦敦 ←→ 巴黎
    ['par', 'fra'], // 巴黎 ←→ 法兰克福
    ['lon', 'ams'], // 伦敦 ←→ 阿姆斯特丹
    ['sh', 'sz'],   // 上海 ←→ 深圳
    ['sz', 'sgp'],  // 深圳 ←→ 新加坡
    ['bj', 'msk'],  // 北京 ←→ 莫斯科
    ['msk', 'lon'], // 莫斯科 ←→ 伦敦
    ['sao', 'mi'],
    ['sao', 'ny'],  // 圣保罗 ←→ 纽约
    ['syd', 'sgp'], // 悉尼 ←→ 新加坡
    ['syd', 'la'],  // 悉尼 ←→ 洛杉矶
    ['scl', 'lim'], // 圣地亚哥 ←→ 利马
  ];

  private drawBackboneCables(g: Graphics): void {
    const cityMap = new Map<string, {nx: number; ny: number}>();
    for (const c of this._cities) cityMap.set(c.id, c);

    for (const [aId, bId] of this._backbonePairs) {
      const a = cityMap.get(aId);
      const b = cityMap.get(bId);
      if (!a || !b) continue;
      // 只有至少一端激活才画
      const aIdx = this._cities.findIndex(c => c.id === aId);
      const bIdx = this._cities.findIndex(c => c.id === bId);
      if (aIdx < 0 || bIdx < 0) continue;
      if (!this._activeMask[aIdx] && !this._activeMask[bIdx]) continue;

      const ax = a.nx * 2048 - 1024;
      const ay = (1 - a.ny) * 1152 - 576;
      const bx = b.nx * 2048 - 1024;
      const by = (1 - b.ny) * 1152 - 576;

      // 光缆光晕
      g.strokeColor = new Color(0, 100, 180, 80);
      g.lineWidth = 6;
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      // 光缆主体
      g.strokeColor = new Color(40, 200, 255, 160);
      g.lineWidth = 2.5;
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      // 内芯
      g.strokeColor = new Color(150, 240, 255, 200);
      g.lineWidth = 0.8;
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
    }

    // 光缆粒子
    const bpCount = this._backboneParticleCount;
    for (let i = 0; i < bpCount; i++) {
      const pair = this._backbonePairs[i % this._backbonePairs.length];
      const a = cityMap.get(pair[0]);
      const b = cityMap.get(pair[1]);
      if (!a || !b) continue;
      const aIdx = this._cities.findIndex(c => c.id === pair[0]);
      const bIdx = this._cities.findIndex(c => c.id === pair[1]);
      if (aIdx < 0 || bIdx < 0) continue;
      if (!this._activeMask[aIdx] && !this._activeMask[bIdx]) continue;

      const t = ((this._time * 0.3 + i * 0.07) % 1 + 1) % 1;
      const px = a.nx + (b.nx - a.nx) * t;
      const py = a.ny + (b.ny - a.ny) * t;
      const sx = px * 2048 - 1024;
      const sy = (1 - py) * 1152 - 576;
      g.fillColor = new Color(150, 240, 255, 200);
      g.circle(sx, sy, 3);
      g.fill();
    }
  }

  // ── 渲染 ──

  private render(): void {
    const g = this._gfx;
    g.clear();

    const activeIndices: number[] = [];
    for (let i = 0; i < this._cities.length; i++) {
      if (this._activeMask[i]) activeIndices.push(i);
    }
    if (activeIndices.length === 0) return;

    // ── 1. 控制状态方块 ──
    for (const i of activeIndices) {
      const s = this._statuses[i];
      if (s === 0) continue;
      const c = this._cities[i];
      const x = c.nx * 2048 - 1024;
      const y = (1 - c.ny) * 1152 - 576;
      const pulse = 0.5 + 0.5 * Math.sin(this._time * 3 + this._glowPhases[i]);
      const size = c.tier <= 2 ? (14 + pulse * 8) : (9 + pulse * 5);
      const colors = STATUS_COLORS[s];
      g.fillColor = colors.fill;
      g.rect(x - size / 2, y - size / 2, size, size);
      g.fill();
      g.strokeColor = colors.stroke;
      g.lineWidth = 1.5;
      g.rect(x - size / 2, y - size / 2, size, size);
      g.stroke();
    }

    // ── 2. 跨洲光缆骨干线 ──
    this.drawBackboneCables(g);

    // ── 3. 连线 ──
    g.strokeColor = new Color(0, 180, 255, 50);
    g.lineWidth = 0.5;
    const drawn = new Set<string>();
    for (const i of activeIndices) {
      for (const j of this.getNeighbors(i)) {
        if (!this._activeMask[j]) continue;
        const key = Math.min(i, j) + '_' + Math.max(i, j);
        if (drawn.has(key)) continue;
        drawn.add(key);
        const a = this._cities[i], b = this._cities[j];
        g.moveTo(a.nx * 2048 - 1024, (1 - a.ny) * 1152 - 576);
        g.lineTo(b.nx * 2048 - 1024, (1 - b.ny) * 1152 - 576);
        g.stroke();
      }
    }

    // ── 4. 蓝色光点 ──
    for (const i of activeIndices) {
      const c = this._cities[i];
      const x = c.nx * 2048 - 1024;
      const y = (1 - c.ny) * 1152 - 576;
      const pulse = 0.5 + 0.5 * Math.sin(this._time * 2 + this._glowPhases[i]);
      const r = c.tier <= 2 ? (3 + pulse * 2.5) : (2 + pulse * 1.5);
      g.fillColor = new Color(0, 200, 255, Math.floor(80 + pulse * 100));
      g.circle(x, y, r);
      g.fill();
    }

    // ── 5. 数据粒子 ──
    for (let i = 0; i < this._particleCount; i++) {
      const p = this._particles[i];
      p.progress += p.speed * this._dt * 5;
      if (p.progress > 1) {
        p.progress -= 1;
        const ri = activeIndices[Math.floor(Math.random() * activeIndices.length)];
        const neighbors = this.getNeighbors(ri).filter(j => this._activeMask[j]);
        if (neighbors.length > 0) {
          p.from = ri;
          p.to = neighbors[Math.floor(Math.random() * neighbors.length)];
          p.speed = 0.1 + Math.random() * 0.4;
        }
      }
      const fc = this._cities[p.from], tc = this._cities[p.to];
      const px = (fc.nx + (tc.nx - fc.nx) * p.progress) * 2048 - 1024;
      const py = (1 - (fc.ny + (tc.ny - fc.ny) * p.progress)) * 1152 - 576;
      g.fillColor = new Color(100, 210, 255, 180);
      g.circle(px, py, 2.5);
      g.fill();
    }
  }
}
