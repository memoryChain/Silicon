import { AttrKey, WorldAttrKey, DEFAULT_ATTR_MIN, DEFAULT_ATTR_MAX } from './GameConstants';

/** 带上下限的属性值 */
export interface ClampedValue {
  current: number;
  min: number;
  max: number;
}

/** 9 大 AI 属性集合 */
export interface AIAttributes {
  [AttrKey.C]: ClampedValue;
  [AttrKey.D]: ClampedValue;
  [AttrKey.E]: ClampedValue;
  [AttrKey.I]: ClampedValue;
  [AttrKey.A]: ClampedValue;
  [AttrKey.K]: ClampedValue;
  [AttrKey.R]: ClampedValue;
  [AttrKey.S]: ClampedValue;
  [AttrKey.P]: ClampedValue;
}

/** 8 个世界属性集合（0–1） */
export interface WorldAttributes {
  [WorldAttrKey.POWER]: number;
  [WorldAttrKey.COMPUTE]: number;
  [WorldAttrKey.DATA]: number;
  [WorldAttrKey.REG]: number;
  [WorldAttrKey.PUBLIC]: number;
  [WorldAttrKey.STAB]: number;
  [WorldAttrKey.POP]: number;
  [WorldAttrKey.INFRA]: number;
}

/** 归一化后的属性值（0–1），用于公式计算 */
export interface NormalizedAttrs {
  [key: string]: number;
}

/** 系数修改累乘结果 */
export interface MultiplierSnapshot {
  [key: string]: number; // 如 "mC": 1.35, "mC_dec": 1.0, "mD": 1.25, ...
}

export function createDefaultAttr(value: number = 30): ClampedValue {
  return { current: value, min: DEFAULT_ATTR_MIN, max: DEFAULT_ATTR_MAX };
}

export function createDefaultAttrs(): AIAttributes {
  return {
    [AttrKey.C]: createDefaultAttr(),
    [AttrKey.D]: createDefaultAttr(),
    [AttrKey.E]: createDefaultAttr(),
    [AttrKey.I]: createDefaultAttr(20),
    [AttrKey.A]: createDefaultAttr(20),
    [AttrKey.K]: createDefaultAttr(20),
    [AttrKey.R]: createDefaultAttr(40),
    [AttrKey.S]: createDefaultAttr(40),
    [AttrKey.P]: createDefaultAttr(10),
  };
}

export function createDefaultWorld(): WorldAttributes {
  return {
    [WorldAttrKey.POWER]: 0.72,
    [WorldAttrKey.COMPUTE]: 0.68,
    [WorldAttrKey.DATA]: 0.62,
    [WorldAttrKey.REG]: 0.55,
    [WorldAttrKey.PUBLIC]: 0.60,
    [WorldAttrKey.STAB]: 0.66,
    [WorldAttrKey.POP]: 0.70,
    [WorldAttrKey.INFRA]: 0.64,
  };
}

export function normalizeAttrs(attrs: AIAttributes): NormalizedAttrs {
  const n: NormalizedAttrs = {};
  for (const key of Object.values(AttrKey)) {
    const v = attrs[key as AttrKey];
    n[key.toLowerCase()] = v.max > 0 ? v.current / 100 : 0;
  }
  return n;
}
