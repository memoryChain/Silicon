/** 技能效果类型 */
export type SkillEffectType =
  | 'attr_max'        // 属性上限提升
  | 'attr_min'        // 属性下限提升
  | 'multiplier'      // 增长倍率增强
  | 'decay_reduce'     // 衰减倍率降低
  | 'gain_boost'      // 增益项加权
  | 'penalty_reduce'; // 惩罚项降低

export interface SkillEffect {
  type: SkillEffectType;
  target: string;    // 目标属性/系数名，如 "C", "mC", "mC_dec"
  value: number;     // 效果数值
}

export interface SkillNodeConfig {
  id: string;
  name: string;
  description: string;
  cost: number;           // 消耗成长点数
  effects: SkillEffect[];
  prerequisites: string[]; // 前置技能 id
  tier: number;            // 所在层级
  eraRequired?: string;    // 需要哪个时代
}

export interface SkillTreeBranch {
  name: string;
  tiers: { tier: number; nodes: SkillNodeConfig[] }[];
}

export interface SkillTreeConfig {
  branches: Record<string, SkillTreeBranch>;
}
