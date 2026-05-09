import { resources, JsonAsset } from 'cc';
import { AITypeConfig } from '../data/AITypeData';
import { SkillTreeConfig } from '../data/SkillData';
import { FormulaConfig } from '../data/FormulaTypes';
import { GameEventConfig } from '../data/EventData';
import { WorldAttributes } from '../data/AttributeData';
import { EraConfig } from '../configs/Eras';

/**
 * 配置管理器 —— 运行时从 resources/configs/ 加载 JSON 文件。
 * 数值调整只需修改 JSON，无需重新编译。
 */
export class ConfigManager {
  private _aiTypes: Map<string, AITypeConfig> = new Map();
  private _skillTree: SkillTreeConfig = null!;
  private _worldInit: WorldAttributes = null!;
  private _formulaConfig: FormulaConfig = null!;
  private _events: GameEventConfig[] = [];
  private _eraConfig: EraConfig = null!;
  private _loaded = false;

  get aiTypes(): ReadonlyMap<string, AITypeConfig> { return this._aiTypes; }
  get skillTree(): SkillTreeConfig { return this._skillTree; }
  get worldInit(): WorldAttributes { return this._worldInit; }
  get formulaConfig(): FormulaConfig { return this._formulaConfig; }
  get events(): GameEventConfig[] { return this._events; }
  get eraConfig(): EraConfig { return this._eraConfig; }

  /** 从 JSON 文件异步加载全部配置 */
  async loadAll(): Promise<void> {
    if (this._loaded) return;

    const load = (path: string): Promise<any> =>
      new Promise((resolve, reject) => {
        resources.load(path, JsonAsset, (err, asset) => {
          if (err) { reject(err); return; }
          resolve(asset.json);
        });
      });

    try {
      const [aiTypes, skillTree, worldInit, formula, events, eras] = await Promise.all([
        load('configs/ai_types'),
        load('configs/skill_tree'),
        load('configs/world_init'),
        load('configs/formula_coeffs'),
        load('configs/events'),
        load('configs/eras'),
      ]);

      this._loadAITypes(aiTypes);
      this._skillTree = skillTree;
      this._worldInit = worldInit;
      this._formulaConfig = formula;
      this._events = Array.isArray(events) ? events : (events.events ?? []);
      this._eraConfig = eras;
      this._loaded = true;
    } catch (e) {
      console.error('[ConfigManager] JSON 配置加载失败:', e);
      throw e;
    }
  }

  private _loadAITypes(data: any): void {
    this._aiTypes.clear();
    if (Array.isArray(data)) {
      for (const item of data) this._aiTypes.set(item.id, item);
    } else {
      for (const [key, val] of Object.entries(data)) {
        this._aiTypes.set(key, val as AITypeConfig);
      }
    }
  }

  getEraDrift(era: string): Record<string, number> {
    return this._eraConfig?.eras[era] ?? {};
  }
}
