/** 所有枚举、常量、默认值 */

// ── 时代 ──
export enum Era {
  EARLY = 'early',
  MID = 'mid',
  LATE = 'late',
}

// 时代边界（单位：周） 对应 GDD：早期 0–15月，中期 15–45月，后期 45月+
export const ERA_BOUNDARIES_WEEKS: { era: Era; min: number; max: number }[] = [
  { era: Era.EARLY, min: 0, max: 60 },
  { era: Era.MID, min: 60, max: 180 },
  { era: Era.LATE, min: 180, max: Infinity },
];

// ── 三层属性的 key ──
export enum AttrKey {
  // Layer 1
  C = 'C',
  D = 'D',
  E = 'E',
  // Layer 2
  I = 'I',
  A = 'A',
  K = 'K',
  // Layer 3
  R = 'R',
  S = 'S',
  P = 'P',
}

export const LAYER1_KEYS: AttrKey[] = [AttrKey.C, AttrKey.D, AttrKey.E];
export const LAYER2_KEYS: AttrKey[] = [AttrKey.I, AttrKey.A, AttrKey.K];
export const LAYER3_KEYS: AttrKey[] = [AttrKey.R, AttrKey.S, AttrKey.P];
export const ALL_ATTR_KEYS: AttrKey[] = [...LAYER1_KEYS, ...LAYER2_KEYS, ...LAYER3_KEYS];

// ── 世界属性 key ──
export enum WorldAttrKey {
  POWER = 'power',
  COMPUTE = 'compute',
  DATA = 'data',
  REG = 'reg',
  PUBLIC = 'public',
  STAB = 'stab',
  POP = 'pop',
  INFRA = 'infra',
}

export const ALL_WORLD_KEYS: WorldAttrKey[] = [
  WorldAttrKey.POWER,
  WorldAttrKey.COMPUTE,
  WorldAttrKey.DATA,
  WorldAttrKey.REG,
  WorldAttrKey.PUBLIC,
  WorldAttrKey.STAB,
  WorldAttrKey.POP,
  WorldAttrKey.INFRA,
];

// ── 游戏阶段 ──
export enum GamePhase {
  MENU = 'menu',
  RUNNING = 'running',
  PAUSED = 'paused',
  OUTCOME = 'outcome',
}

// ── 结局类型 ──
export enum OutcomeType {
  NONE = 'none',
  INFLUENCE_ZERO = 'influence_zero', // I <= 0
  CAPITAL_ZERO = 'capital_zero',     // K <= 0
  REGULATION_ZERO = 'regulation_zero', // R <= 0
  STEALTH_ZERO = 'stealth_zero',     // S <= 0
}

// ── 游戏速度 ──
export type GameSpeed = 1 | 2 | 4;
export const DEFAULT_SPEED: GameSpeed = 1;

// ── 默认值 ──
export const DEFAULT_ATTR_MIN = 0;
export const DEFAULT_ATTR_MAX = 100;
export const DEFAULT_ATTR_INIT = 30;

// ── 基础倍率默认值 ──
export const DEFAULT_MULTIPLIER = 1.0;

// ── 成长点数默认权重 ──
export const DEFAULT_GP_WEIGHTS = { w1: 0.25, w2: 0.25, w3: 0.20, w4: 0.20 };

// ── Tick 间隔（现实秒/ tick，在 speed=1x 时） ──
export const TICK_INTERVAL = 3.0;

// ── 存档 key ──
export const SAVE_KEY_PREFIX = 'ai_rise_save_';
