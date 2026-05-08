/** 公式类型定义 */

export interface InputTerm {
  /** 属性源（归一化后的属性名，小写），如 'c', 'd', 'i' */
  source: string;
  /** 权重系数 */
  weight: number;
  /** 可选变换：'none'=直接使用, 'inverse'=1-x */
  transform?: 'none' | 'inverse';
}

export interface WorldMod {
  /** 世界属性源 */
  source: string;
  /** 因子 */
  factor: number;
  /** 模式: multiply=(1 - factor*W), direct=factor*W */
  mode: 'multiply' | 'direct';
}

export interface FormulaTermDef {
  /** 基础速率 */
  rate: number;
  /** 输入项列表（空列表 = 使用 1.0 作为恒等输入） */
  inputs: InputTerm[];
  /** 世界属性调节 */
  worldMod: WorldMod | null;
}

export interface FormulaDef {
  gain: FormulaTermDef;
  penalty: FormulaTermDef;
  /** 额外惩罚项（如 S 的 Sinfra * W_infra） */
  extraPenalty?: FormulaTermDef;
}

/** 一个属性的完整公式定义映射 */
export type FormulaConfig = Record<string, FormulaDef>;
