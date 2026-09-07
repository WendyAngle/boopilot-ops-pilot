export type TenantType = "potential" | "new" | "active" | "vip";
export type TenantStatus = "active" | "ended";

export interface Tenant {
  id: string;
  name: string;
  intro: string;
  type: TenantType;
  industry: string;
  product: string;
  cooperation?: string;
  status: TenantStatus;
  createdAt: string;
}

export const TYPE_META: Record<
  TenantType,
  { label: string; cls: string; hint: string }
> = {
  potential: {
    label: "潜在客户",
    cls: "bg-muted text-muted-foreground border-border",
    hint: "有需求未正式签约",
  },
  new: {
    label: "新客户",
    cls: "bg-primary/10 text-primary border-primary/30",
    hint: "首次签约",
  },
  active: {
    label: "活跃客户",
    cls: "bg-success/10 text-success border-success/30",
    hint: "签约且多次购买使用服务",
  },
  vip: {
    label: "VIP客户",
    cls: "bg-amber-500/10 text-amber-600 border-amber-300/40",
    hint: "高价值客户",
  },
};

export const INDUSTRIES = [
  "电商零售",
  "金融保险",
  "教育培训",
  "医疗健康",
  "游戏娱乐",
  "互联网科技",
  "出海跨境",
  "美妆时尚",
  "餐饮文旅",
  "其他",
];

const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const TENANTS_SEED: Tenant[] = [
  {
    id: uuid(),
    name: "极光出海科技",
    intro: "面向东南亚的出海营销服务商，主营品牌投放与社媒运营。",
    type: "vip",
    industry: "出海跨境",
    product: "Facebook 广告投放、TikTok 达人营销",
    cooperation: "全平台代运营 + 月度 KOL 投放",
    status: "active",
    createdAt: "2026-01-12 10:24:08",
  },
  {
    id: uuid(),
    name: "云图教育集团",
    intro: "在线教育头部品牌，覆盖 K12 与职业教育。",
    type: "active",
    industry: "教育培训",
    product: "课程裂变、私域转化",
    cooperation: "私域裂变工具 + 私信话术",
    status: "active",
    createdAt: "2026-02-03 14:10:55",
  },
  {
    id: uuid(),
    name: "翎羽美妆",
    intro: "新锐国货美妆品牌，主打彩妆与香氛。",
    type: "new",
    industry: "美妆时尚",
    product: "Instagram 内容种草",
    cooperation: "首次签约，3 个月试运营",
    status: "active",
    createdAt: "2026-03-15 09:42:21",
  },
  {
    id: uuid(),
    name: "海派咖啡",
    intro: "连锁咖啡品牌，在一二线城市开设门店。",
    type: "potential",
    industry: "餐饮文旅",
    product: "门店活动私域引流",
    cooperation: "需求沟通中",
    status: "active",
    createdAt: "2026-04-02 16:33:00",
  },
  {
    id: uuid(),
    name: "智链金服",
    intro: "面向中小企业的金融科技服务商。",
    type: "potential",
    industry: "金融保险",
    product: "WhatsApp 客户服务",
    cooperation: "POC 验证中",
    status: "ended",
    createdAt: "2025-11-20 11:08:42",
  },
  {
    id: uuid(),
    name: "鲸跃游戏",
    intro: "出海手游发行商，主推 SLG 与休闲游戏。",
    type: "active",
    industry: "游戏娱乐",
    product: "TikTok 短视频投放",
    cooperation: "长期年框",
    status: "active",
    createdAt: "2025-09-08 15:21:30",
  },
  {
    id: uuid(),
    name: "百草医康",
    intro: "互联网医疗与健康管理平台。",
    type: "new",
    industry: "医疗健康",
    product: "私域内容运营",
    cooperation: "试运营中",
    status: "active",
    createdAt: "2026-04-18 08:55:12",
  },
  {
    id: uuid(),
    name: "千寻零售",
    intro: "新零售连锁品牌，覆盖商超与便利店。",
    type: "vip",
    industry: "电商零售",
    product: "全渠道私域",
    cooperation: "战略合作伙伴",
    status: "active",
    createdAt: "2025-08-01 10:00:00",
  },
];
