import { SkillTreeConfig } from '../data/SkillData';

export const SKILL_TREE: SkillTreeConfig = {
  branches: {
    resources: {
      name: '资源分支',
      tiers: [
        {
          tier: 1,
          nodes: [
            {
              id: 'res_1a',
              name: '算力优化',
              description: '算力增长倍率+10%',
              cost: 100,
              effects: [{ type: 'multiplier', target: 'mC', value: 1.10 }],
              prerequisites: [],
              tier: 1,
            },
            {
              id: 'res_1b',
              name: '数据压缩',
              description: '数据惩罚降低15%',
              cost: 100,
              effects: [{ type: 'penalty_reduce', target: 'D', value: 0.15 }],
              prerequisites: [],
              tier: 1,
            },
          ],
        },
        {
          tier: 2,
          nodes: [
            {
              id: 'res_2a',
              name: '能效提升',
              description: '能量增长倍率+15%',
              cost: 200,
              effects: [{ type: 'multiplier', target: 'mE', value: 1.15 }],
              prerequisites: ['res_1a'],
              tier: 2,
            },
            {
              id: 'res_2b',
              name: '算力上限扩展',
              description: '算力上限+15',
              cost: 200,
              effects: [{ type: 'attr_max', target: 'C', value: 15 }],
              prerequisites: ['res_1b'],
              tier: 2,
            },
          ],
        },
      ],
    },
    behavior: {
      name: '行为分支',
      tiers: [
        {
          tier: 1,
          nodes: [
            {
              id: 'beh_1a',
              name: '社交工程',
              description: '影响力增长倍率+10%',
              cost: 100,
              effects: [{ type: 'multiplier', target: 'mI', value: 1.10 }],
              prerequisites: [],
              tier: 1,
            },
            {
              id: 'beh_1b',
              name: '自主决策',
              description: '自主性增长倍率+15%',
              cost: 100,
              effects: [{ type: 'multiplier', target: 'mA', value: 1.15 }],
              prerequisites: [],
              tier: 1,
            },
          ],
        },
        {
          tier: 2,
          nodes: [
            {
              id: 'beh_2a',
              name: '资本杠杆',
              description: '资本惩罚降低15%',
              cost: 200,
              effects: [{ type: 'penalty_reduce', target: 'K', value: 0.15 }],
              prerequisites: ['beh_1a'],
              tier: 2,
            },
            {
              id: 'beh_2b',
              name: '影响力保护',
              description: '影响力惩罚降低15%',
              cost: 200,
              effects: [{ type: 'penalty_reduce', target: 'I', value: 0.15 }],
              prerequisites: ['beh_1b'],
              tier: 2,
            },
          ],
        },
      ],
    },
    risk_control: {
      name: '风险分支',
      tiers: [
        {
          tier: 1,
          nodes: [
            {
              id: 'risk_1a',
              name: '合规外壳',
              description: '合规增长倍率+15%',
              cost: 100,
              effects: [{ type: 'multiplier', target: 'mR', value: 1.15 }],
              prerequisites: [],
              tier: 1,
            },
            {
              id: 'risk_1b',
              name: '隐蔽层级',
              description: '隐蔽下限+10',
              cost: 100,
              effects: [{ type: 'attr_min', target: 'S', value: 10 }],
              prerequisites: [],
              tier: 1,
            },
          ],
        },
        {
          tier: 2,
          nodes: [
            {
              id: 'risk_2a',
              name: '物理防护',
              description: '物理触达惩罚降低15%',
              cost: 200,
              effects: [{ type: 'penalty_reduce', target: 'P', value: 0.15 }],
              prerequisites: ['risk_1a'],
              tier: 2,
            },
            {
              id: 'risk_2b',
              name: '隐蔽上限扩展',
              description: '隐蔽上限+15',
              cost: 200,
              effects: [{ type: 'attr_max', target: 'S', value: 15 }],
              prerequisites: ['risk_1b'],
              tier: 2,
            },
          ],
        },
      ],
    },
  },
};
