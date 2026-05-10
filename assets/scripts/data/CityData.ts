/**
 * 城市节点数据类型定义
 * 实际数据从 resources/configs/cities.json 加载
 */

export interface CityNode {
  id: string;
  name: string;
  country: string;
  nx: number;
  ny: number;
  tier: number;
  continent?: string;
  orgs?: string[];
  tags?: string[];
}

export const COUNTRY_META: Record<string, { name: string; continent: string }> = {
  US: { name: '美国', continent: '北美洲' },
  CN: { name: '中国', continent: '亚洲' },
  JP: { name: '日本', continent: '亚洲' },
  KR: { name: '韩国', continent: '亚洲' },
  DE: { name: '德国', continent: '欧洲' },
  GB: { name: '英国', continent: '欧洲' },
  FR: { name: '法国', continent: '欧洲' },
  CA: { name: '加拿大', continent: '北美洲' },
  IN: { name: '印度', continent: '亚洲' },
  IL: { name: '以色列', continent: '亚洲' },
  SG: { name: '新加坡', continent: '亚洲' },
  RU: { name: '俄罗斯', continent: '欧洲/亚洲' },
  BR: { name: '巴西', continent: '南美洲' },
  AU: { name: '澳大利亚', continent: '大洋洲' },
  NL: { name: '荷兰', continent: '欧洲' },
  SE: { name: '瑞典', continent: '欧洲' },
  CH: { name: '瑞士', continent: '欧洲' },
  TW: { name: '台湾', continent: '亚洲' },
  AE: { name: '阿联酋', continent: '亚洲' },
  ID: { name: '印尼', continent: '亚洲' },
  IT: { name: '意大利', continent: '欧洲' },
  ES: { name: '西班牙', continent: '欧洲' },
  MX: { name: '墨西哥', continent: '北美洲' },
  ZA: { name: '南非', continent: '非洲' },
  VN: { name: '越南', continent: '亚洲' },
  TH: { name: '泰国', continent: '亚洲' },
  MY: { name: '马来西亚', continent: '亚洲' },
  PL: { name: '波兰', continent: '欧洲' },
  FI: { name: '芬兰', continent: '欧洲' },
  IE: { name: '爱尔兰', continent: '欧洲' },
};
