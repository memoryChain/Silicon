import { FormulaConfig, FormulaTermDef } from '../data/FormulaTypes';
import { NormalizedAttrs, WorldAttributes, MultiplierSnapshot } from '../data/AttributeData';

/**
 * 公式计算引擎 —— 纯函数集合
 * 根据公式配置和当前状态计算属性的增量
 *
 * 通用公式：
 *   ΔX = Δt × ( mX × G_X  −  mX_dec × (P_X + Extra_X) )
 *
 * 其中：
 *   G_X/P_X = rate × (Σ weight_i × transform(val_i)) × worldMod
 */
export class FormulaEngine {
  private config: FormulaConfig;

  constructor(config: FormulaConfig) {
    this.config = config;
  }

  /** 计算单个属性的 ΔX */
  computeDelta(
    attrKey: string,
    norm: NormalizedAttrs,
    world: WorldAttributes,
    multipliers: MultiplierSnapshot,
    dt: number,
  ): number {
    const def = this.config[attrKey];
    if (!def) return 0;

    const mKey = `m${attrKey}`;
    const mDecKey = `m${attrKey}_dec`;

    const mX = multipliers[mKey] ?? 1.0;
    const mXDec = multipliers[mDecKey] ?? 1.0;

    const gain = this.evalTerm(def.gain, norm, world);
    const penalty = this.evalTerm(def.penalty, norm, world);
    let extra = 0;
    if (def.extraPenalty) {
      extra = this.evalTerm(def.extraPenalty, norm, world);
    }

    return dt * (mX * gain - mXDec * (penalty + extra));
  }

  /** 计算公式项值 */
  private evalTerm(term: FormulaTermDef, norm: NormalizedAttrs, world: WorldAttributes): number {
    if (!term) return 0;

    // 输入加权和
    let inputSum: number;
    if (term.inputs.length === 0) {
      inputSum = 1.0; // 恒等输入
    } else {
      inputSum = 0;
      for (const inp of term.inputs) {
        let val = norm[inp.source] ?? 0;
        if (inp.transform === 'inverse') {
          val = 1 - val;
        }
        inputSum += inp.weight * val;
      }
    }

    // 基础项 = rate × 输入加权和
    let result = term.rate * inputSum;

    // 世界属性调节
    if (term.worldMod) {
      const wVal = world[term.worldMod.source] ?? 0;
      if (term.worldMod.mode === 'multiply') {
        // (1 - factor × W)
        result *= (1 - term.worldMod.factor * wVal);
      } else {
        // factor × W （直接乘）
        result *= term.worldMod.factor * wVal;
      }
    }

    return result;
  }
}
