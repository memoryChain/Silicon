import { AITypeConfig } from '../data/AITypeData';
import { SkillTreeConfig } from '../data/SkillData';
import { FormulaConfig } from '../data/FormulaTypes';
import { GameEventConfig } from '../data/EventData';
import { WorldAttributes } from '../data/AttributeData';
import { AI_TYPES } from '../configs/AITypes';
import { FORMULA_COEFFS } from '../configs/FormulaCoeffs';
import { WORLD_INIT } from '../configs/WorldInit';
import { SKILL_TREE } from '../configs/SkillTree';
import { EVENTS } from '../configs/Events';
import { ERA_CONFIG, EraConfig } from '../configs/Eras';

/**
 * 配置管理器 —— 通过直接 import TS 模块加载配置，不依赖 resources.load。
 * 所有配置数据在编译时打包，无需运行时加载 JSON 文件。
 */
export class ConfigManager {
  private _aiTypes: Map<string, AITypeConfig> = new Map();
  private _skillTree: SkillTreeConfig;
  private _worldInit: WorldAttributes;
  private _formulaConfig: FormulaConfig;
  private _events: GameEventConfig[];
  private _eraConfig: EraConfig;
  private _loaded = false;

  get aiTypes(): ReadonlyMap<string, AITypeConfig> { return this._aiTypes; }
  get skillTree(): SkillTreeConfig { return this._skillTree; }
  get worldInit(): WorldAttributes { return this._worldInit; }
  get formulaConfig(): FormulaConfig { return this._formulaConfig; }
  get events(): GameEventConfig[] { return this._events; }
  get eraConfig(): EraConfig { return this._eraConfig; }

  /** 从 import 的 TS 模块加载配置（同步，无需等待） */
  loadAll(): void {
    if (this._loaded) return;

    this._loadAITypes(AI_TYPES);
    this._skillTree = SKILL_TREE;
    this._worldInit = WORLD_INIT;
    this._formulaConfig = FORMULA_COEFFS;
    this._events = EVENTS;
    this._eraConfig = ERA_CONFIG;
    this._loaded = true;
  }

  private _loadAITypes(data: Record<string, AITypeConfig>): void {
    this._aiTypes.clear();
    for (const [key, val] of Object.entries(data)) {
      this._aiTypes.set(key, val);
    }
  }

  getEraDrift(era: string): Record<string, number> {
    return this._eraConfig?.eras[era] ?? {};
  }
}
