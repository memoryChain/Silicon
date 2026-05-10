import { Node, Graphics, Color, UITransform } from 'cc';
import { GameState } from '../core/GameState';
import { GamePhase } from '../data/GameConstants';
import { CityNode } from '../data/CityData';

export interface CitiesConfig {
  countries: { id: string; name: string; continent: string }[];
  cities: CityNode[];
}

type ControlStatus = 0 | 1 | 2 | 3 | 4;

const STATUS_FILLS: Record<number, Color> = {
  1: new Color(200, 50, 40, 80),
  2: new Color(200, 160, 20, 80),
  3: new Color(40, 180, 80, 80),
  4: new Color(30, 140, 220, 80),
};

export class WorldMapOverlay {
  readonly node: Node;
  private _gfx: Graphics;
  private _fillLayers: Graphics[] = [];
  private _cities: CityNode[];
  private _activeMask: boolean[];
  private _statuses: ControlStatus[];
  private _activeTimer: number[];
  private _glowPhases: number[];
  private _particles: { from: number; to: number; progress: number; speed: number }[] = [];
  private _particleCount = 600;
  private _backboneParticleCount = 150;
  private _neighborCache: Map<number, number[]> = new Map();
  private _time = 0;
  private _dt = 0.016;
  private _frameSkip = 0;
  private _debugFull = true;
  private _debugDemoMode = 0;
  private _hiddenContinents: Set<string> = new Set();
  private _gridSize = 10;
  private _spatialGrid: number[][] = [];
  private _countryPaths: Map<string, string> = new Map();

  private _backbonePairs: [string, string][] = [
    ['sf','tk'],['la','tk'],['sf','sh'],['ny','lon'],['bo','lon'],
    ['sh','sgp'],['tk','sgp'],['sgp','mum'],['mum','dub'],['dub','lon'],
    ['dub','ist'],['lon','par'],['par','fra'],['lon','ams'],
    ['sh','sz'],['sz','sgp'],['bj','msk'],['msk','lon'],
    ['sao','mi'],['sao','ny'],['syd','sgp'],['syd','la'],['scl','lim'],
  ];

  constructor(parent: Node, mW: number, mH: number, cfg: CitiesConfig, countryPaths: { id: string; path: string }[]) {
    for (const s of countryPaths) this._countryPaths.set(s.id, s.path);

    const node = new Node('MapOverlay');
    node.parent = parent;
    this.node = node;
    node.addComponent(UITransform).setContentSize(mW, mH);
    this._gfx = node.addComponent(Graphics);
    for (let s = 1; s <= 4; s++) {
      const fn = new Node('FillL' + s);
      fn.parent = node;
      fn.addComponent(UITransform).setContentSize(mW, mH);
      this._fillLayers.push(fn.addComponent(Graphics));
    }

    this._cities = cfg.cities;
    const n = this._cities.length;
    this._activeMask = new Array(n).fill(false);
    this._statuses = new Array(n).fill(0);
    this._activeTimer = new Array(n).fill(0);
    this._glowPhases = this._cities.map(() => Math.random() * Math.PI * 2);

    for (let i = 0; i < this._particleCount; i++)
      this._particles.push({ from: 0, to: 1, progress: Math.random(), speed: 0.1 + Math.random() * 0.4 });

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
    for (let i = 0; i < this._cities.length; i++)
      this._neighborCache.set(i, this.calcNeighbors(i));
  }

  private calcNeighbors(idx: number): number[] {
    const c = this._cities[idx]; const g = this._gridSize;
    const cx = Math.floor(c.nx * g), cy = Math.floor(c.ny * g);
    const r: number[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx >= 0 && gx < g && gy >= 0 && gy < g)
          for (const ni of this._spatialGrid[gy * g + gx])
            if (ni > idx && Math.hypot(this._cities[ni].nx - c.nx, this._cities[ni].ny - c.ny) < 0.06)
              r.push(ni);
      }
    return r;
  }

  private getNeighbors(idx: number): number[] { return this._neighborCache.get(idx) || []; }

  // 调试
  cycleDebugMode(): string {
    this._debugDemoMode = (this._debugDemoMode + 1) % 6;
    return ['混合','全反对(红)','全争议(黄)','全发展(绿)','全掌控(蓝)','仅蓝点'][this._debugDemoMode];
  }
  toggleDebug(): boolean { this._debugFull = !this._debugFull; return this._debugFull; }
  getContinents(): string[] { return [...new Set(this._cities.map(c => c.continent).filter(Boolean))].sort(); }
  toggleContinent(cont: string): boolean {
    if (this._hiddenContinents.has(cont)) { this._hiddenContinents.delete(cont); return true; }
    else { this._hiddenContinents.add(cont); return false; }
  }
  isContinentVisible(cont: string): boolean { return !this._hiddenContinents.has(cont); }

  // 更新
  update(dt: number, state: GameState): void {
    if (state.phase !== GamePhase.RUNNING) return;
    this._time += dt; this._dt = dt;
    this._frameSkip = (this._frameSkip + 1) % 2;
    if (this._frameSkip !== 0) return;

    if (this._debugFull) {
      for (let i = 0; i < this._cities.length; i++)
        this._activeMask[i] = !this._hiddenContinents.has(this._cities[i].continent || '');
      this._applyDebugDemo();
      this.render();
      return;
    }

    const attrs = state.attributes;
    const pNorm = attrs.P.current / 100, iNorm = attrs.I.current / 100;
    const targetActive = Math.floor(pNorm * this._cities.length);
    const activeNow = this._activeMask.filter(Boolean).length;
    for (let i = 0; i < this._cities.length; i++) {
      if (this._activeMask[i]) {
        this._activeTimer[i] += dt;
        if (iNorm < 0.2) this._statuses[i] = 1;
        else if (iNorm < 0.4) this._statuses[i] = this._activeTimer[i] > 20 ? 2 : 1;
        else if (iNorm < 0.6) this._statuses[i] = this._activeTimer[i] > 20 ? 3 : 2;
        else this._statuses[i] = this._activeTimer[i] > 30 ? 4 : 3;
      } else { this._activeTimer[i] = 0; this._statuses[i] = 0; }
    }
    if (activeNow < targetActive) {
      const avail = this._cities.map((c,i)=>({i,c})).filter(({i})=>!this._activeMask[i]).sort((a,b)=>a.c.tier-b.c.tier);
      for (let k=0; k<Math.min(3,targetActive-activeNow) && k<avail.length; k++) {
        this._activeMask[avail[k].i] = true;
        this._glowPhases[avail[k].i] = this._time;
      }
    }
    this.render();
  }

  private _applyDebugDemo(): void {
    const fns = [
      ()=>this._cities.forEach((_,i)=>this._statuses[i]=(1+(i%4))as ControlStatus),
      ()=>this._cities.forEach((_,i)=>this._statuses[i]=1),
      ()=>this._cities.forEach((_,i)=>this._statuses[i]=2),
      ()=>this._cities.forEach((_,i)=>this._statuses[i]=3),
      ()=>this._cities.forEach((_,i)=>this._statuses[i]=4),
      ()=>this._cities.forEach((_,i)=>this._statuses[i]=0),
    ];
    fns[this._debugDemoMode]();
  }

  // 渲染
  private render(): void {
    const g = this._gfx; g.clear();
    const active: number[] = [];
    for (let i = 0; i < this._cities.length; i++) if (this._activeMask[i]) active.push(i);
    if (active.length === 0) return;

    this.drawFills();
    this.drawBackboneCables(g);

    // 连线
    g.strokeColor = new Color(0, 180, 255, 50); g.lineWidth = 0.5;
    const done = new Set<string>();
    for (const i of active) for (const j of this.getNeighbors(i)) {
      if (!this._activeMask[j]) continue;
      const k = Math.min(i,j)+'_'+Math.max(i,j);
      if (done.has(k)) continue; done.add(k);
      const a=this._cities[i], b=this._cities[j];
      g.moveTo(a.nx*2048-1024, (1-a.ny)*1152-576);
      g.lineTo(b.nx*2048-1024, (1-b.ny)*1152-576);
      g.stroke();
    }

    // 光点
    for (const i of active) {
      const c=this._cities[i];
      const x=c.nx*2048-1024, y=(1-c.ny)*1152-576;
      const pulse=0.5+0.5*Math.sin(this._time*2+this._glowPhases[i]);
      const r=c.tier<=2?(3+pulse*2.5):(2+pulse*1.5);
      g.fillColor=new Color(0,200,255,Math.floor(80+pulse*100));
      g.circle(x,y,r); g.fill();
    }

    // 粒子
    for (let i=0;i<this._particleCount;i++) {
      const p=this._particles[i];
      p.progress+=p.speed*this._dt*5;
      if(p.progress>1){p.progress-=1;
        const ri=active[Math.floor(Math.random()*active.length)];
        const nb=this.getNeighbors(ri).filter(j=>this._activeMask[j]);
        if(nb.length>0){p.from=ri;p.to=nb[Math.floor(Math.random()*nb.length)];p.speed=0.1+Math.random()*0.4;}
      }
      const fc=this._cities[p.from], tc=this._cities[p.to];
      const px=(fc.nx+(tc.nx-fc.nx)*p.progress)*2048-1024;
      const py=(1-(fc.ny+(tc.ny-fc.ny)*p.progress))*1152-576;
      g.fillColor=new Color(100,210,255,180);
      g.circle(px,py,2.5); g.fill();
    }
  }

  // 国家填色 —— SVG path 解析
  private drawFills(): void {
    for (const g of this._fillLayers) g.clear();

    const stats = new Map<string,{total:number;sum:number}>();
    for (let i=0;i<this._cities.length;i++) {
      if(!this._activeMask[i]) continue;
      const cc=this._cities[i].country; if(!cc) continue;
      let s=stats.get(cc); if(!s){s={total:0,sum:0};stats.set(cc,s);}
      s.total++; s.sum+=this._statuses[i];
    }

    for (const [code, s] of stats) {
      if (s.total<3||s.sum===0) continue;
      const pathStr=this._countryPaths.get(code); if(!pathStr) continue;
      const avg=Math.round(s.sum/s.total)as 1|2|3|4;
      const color=STATUS_FILLS[avg]; if(!color) continue;
      const g=this._fillLayers[avg-1];
      g.fillColor=color;
      drawSvgPath(g, pathStr);
    }
    for (const g of this._fillLayers) { g.fill(); g.strokeColor=g.fillColor; g.lineWidth=1; g.stroke(); }
  }

  // 光缆
  private drawBackboneCables(g: Graphics): void {
    const m=new Map(this._cities.map(c=>[c.id,c]));
    for (const [aId,bId] of this._backbonePairs) {
      const a=m.get(aId),b=m.get(bId); if(!a||!b) continue;
      const ai=this._cities.findIndex(c=>c.id===aId),bi=this._cities.findIndex(c=>c.id===bId);
      if(!this._activeMask[ai]&&!this._activeMask[bi]) continue;
      const ax=a.nx*2048-1024, ay=(1-a.ny)*1152-576;
      const bx=b.nx*2048-1024, by=(1-b.ny)*1152-576;
      g.strokeColor=new Color(0,100,180,80);g.lineWidth=6;g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
      g.strokeColor=new Color(40,200,255,160);g.lineWidth=2.5;g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
      g.strokeColor=new Color(150,240,255,200);g.lineWidth=0.8;g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
    }
    for(let i=0;i<this._backboneParticleCount;i++){
      const [aId,bId]=this._backbonePairs[i%this._backbonePairs.length];
      const a=m.get(aId),b=m.get(bId); if(!a||!b) continue;
      const t=((this._time*0.3+i*0.07)%1+1)%1;
      const px=(a.nx+(b.nx-a.nx)*t)*2048-1024;
      const py=(1-(a.ny+(b.ny-a.ny)*t))*1152-576;
      g.fillColor=new Color(150,240,255,200);g.circle(px,py,3);g.fill();
    }
  }
}

// SVG path 绘制：每个 M 开始新子路径，Y 轴翻转
function drawSvgPath(g: Graphics, d: string): void {
  const re = /([MLZmlz])([\d.e+\-]*),?([\d.e+\-]*)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1].toUpperCase();
    if (cmd === 'Z') continue;
    const svgX = parseFloat(m[2]) || 0;
    const svgY = parseFloat(m[3]) || 0;
    if (isNaN(svgY)) continue;
    const cx = svgX - 1024;      // SVG X(0-2048) → Cocos 中心
    const cy = 576 - svgY;       // SVG Y↓ → Cocos Y↑
    if (cmd === 'M') g.moveTo(cx, cy);
    else g.lineTo(cx, cy);
  }
}
