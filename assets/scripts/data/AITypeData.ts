import { AttrKey } from './GameConstants';

export interface AITypeConfig {
  id: string;
  name: string;
  description: string;
  /** 初始属性值覆盖（相对于默认值的偏移量） */
  initValues: Partial<Record<AttrKey, number>>;
  /** 增长倍率系数 > 1 表示加速增长 */
  multipliers: Record<string, number>;
  /** 衰减倍率系数 > 1 表示加速衰减 */
  decayMultipliers: Record<string, number>;
  /** 成长点数权重，覆盖默认 w1-w4 */
  gpWeights: { w1: number; w2: number; w3: number; w4: number };
}
