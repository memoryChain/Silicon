import { GameState } from './GameState';
import { ConfigManager } from './ConfigManager';
import { SkillNodeConfig, SkillEffect } from '../data/SkillData';
import { EventBus, GameEvents } from '../utils/EventBus';
import { AttrKey } from '../data/GameConstants';

/** 技能树系统 —— 技能解锁、效果叠加 */
export class SkillTreeSystem {
  private state: GameState;
  private config: ConfigManager;

  constructor(state: GameState, config: ConfigManager) {
    this.state = state;
    this.config = config;
  }

  /** 获取所有技能节点 */
  getAllNodes(): SkillNodeConfig[] {
    const nodes: SkillNodeConfig[] = [];
    const tree = this.config.skillTree;
    if (!tree) return nodes;

    for (const branch of Object.values(tree.branches)) {
      for (const tier of branch.tiers) {
        for (const node of tier.nodes) {
          nodes.push(node);
        }
      }
    }
    return nodes;
  }

  /** 检查技能是否可解锁 */
  canUnlock(nodeId: string): boolean {
    const node = this.findNode(nodeId);
    if (!node) return false;
    if (this.state.unlockedSkills.has(nodeId)) return false;

    // GP 足够？
    if (this.state.growthPoints < node.cost) return false;

    // 前置技能已解锁？
    for (const prereq of node.prerequisites) {
      if (!this.state.unlockedSkills.has(prereq)) return false;
    }

    return true;
  }

  /** 解锁技能 */
  unlock(nodeId: string): boolean {
    if (!this.canUnlock(nodeId)) return false;

    const node = this.findNode(nodeId)!;
    this.state.growthPoints -= node.cost;
    this.state.unlockedSkills.add(nodeId);

    // 重新计算技能系数快照
    this.rebuildMultiplierSnapshot();

    EventBus.emit(GameEvents.SKILL_UNLOCKED, { skillId: nodeId });
    EventBus.emit(GameEvents.GP_CHANGED, { new: this.state.growthPoints });
    return true;
  }

  /**
   * 根据已解锁技能重新计算 multiplierSnapshot
   * 每次 tick 前调用，确保技能效果生效
   */
  rebuildMultiplierSnapshot(): void {
    const snapshot: Record<string, number> = {};

    // 从 AI 类型获取基础倍率
    if (this.state.aiType) {
      Object.assign(snapshot, this.state.aiType.multipliers);
      // 衰减倍率默认 1.0，AI 类型可能提高
      for (const [key, val] of Object.entries(this.state.aiType.decayMultipliers ?? {})) {
        snapshot[key] = val;
      }
    }

    // 应用已解锁技能的效果
    for (const skillId of this.state.unlockedSkills) {
      const node = this.findNode(skillId);
      if (!node) continue;

      for (const effect of node.effects) {
        this.applyEffect(effect, snapshot);
      }
    }

    this.state.multiplierSnapshot = snapshot;
  }

  private applyEffect(effect: SkillEffect, snapshot: Record<string, number>): void {
    const target = effect.target;
    const val = effect.value;

    switch (effect.type) {
      case 'multiplier':
        // 增长倍率累乘
        snapshot[target] = (snapshot[target] ?? 1.0) * val;
        break;
      case 'decay_reduce':
        // 衰减倍率降低
        snapshot[target] = (snapshot[target] ?? 1.0) * val;
        break;
      case 'attr_max':
        // 属性上限提升
        if (this.state.attributes[target as AttrKey]) {
          this.state.attributes[target as AttrKey].max += val;
        }
        break;
      case 'attr_min':
        // 属性下限提升
        if (this.state.attributes[target as AttrKey]) {
          this.state.attributes[target as AttrKey].min += val;
        }
        break;
      case 'gain_boost':
        // 增益项加权（直接加到倍率快照中，由 FormulaEngine 读取）
        snapshot[target] = (snapshot[target] ?? 1.0) + val;
        break;
      case 'penalty_reduce':
        snapshot[target] = (snapshot[target] ?? 1.0) * (1 - val);
        break;
    }
  }

  private findNode(nodeId: string): SkillNodeConfig | null {
    const tree = this.config.skillTree;
    if (!tree) return null;

    for (const branch of Object.values(tree.branches)) {
      for (const tier of branch.tiers) {
        for (const node of tier.nodes) {
          if (node.id === nodeId) return node;
        }
      }
    }
    return null;
  }
}
