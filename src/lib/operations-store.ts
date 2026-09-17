import { useSyncExternalStore } from "react";
import { TENANTS_SEED } from "@/lib/tenants";
import { getTenantScope } from "@/lib/tenant-scope";

const TASK_TENANTS = TENANTS_SEED.filter((t) => t.status === "active");

/**
 * 账号列表 mock（managed-account-mock）中 m-i 的平台按 PLATFORMS[i % 5] 分布。
 * 这里按平台取真实存在的账号 ID，数量不足时循环补齐，保证任务关联的账号
 * 与账号列表数据一致（统计「按账号分布」直接展示账号用户名）。
 */
function managedIdsForPlatform(platform: Platform, count: number): string[] {
  const order: Platform[] = ["Facebook", "Tiktok", "Instagram", "Twitter/X", "WhatsApp"];
  const offset = Math.max(0, order.indexOf(platform));
  const pool = Array.from({ length: 5 }, (_, k) =>
    offset === 0 ? (k + 1) * 5 : offset + k * 5,
  ).map((i) => `m-${i}`);
  return Array.from({ length: Math.max(1, count) }, (_, i) => pool[i % pool.length]);
}

/* ============================================================ */
/* 类型与常量                                                   */
/* ============================================================ */

export type TaskSubType = "nurture" | "action";
export type TaskStatus = "pending" | "running" | "success" | "failed" | "partial";
export type Platform = "Facebook" | "Tiktok" | "WhatsApp" | "Instagram" | "Twitter/X";

export interface TaskRow {
  id: string;
  name: string;
  subtype: TaskSubType;
  platforms: Platform[];
  total: number;
  done: number;
  failed: number;
  status: TaskStatus;
  description: string;
  createdBy: string;
  createdAt: string;
  endTime?: string;
  fromTemplate?: string;
  /** 创建/编辑任务表单的快照，便于编辑时回显完整字段 */
  draft?: Record<string, unknown>;
  /** 是否被手动终止 */
  aborted?: boolean;
  /** 任务来源：私信/好友通过/好友拒绝等手动运营台账 */
  source?: "dm" | "friend-approve" | "friend-reject";
  /** 手动台账任务对应的托管账号 ID */
  sourceAccountId?: string;
  /** 显式指定任务分类（未指定时按 source 推导，默认养号任务） */
  category?: TaskCategory;
  /** 所属租户 */
  tenantId?: string;
  tenantName?: string;
}

export type ExecState = "completed" | "running" | "pending" | "aborted";

export const EXEC_STATE_LABEL: Record<ExecState, string> = {
  completed: "已完成",
  running: "执行中",
  pending: "待执行",
  aborted: "手动终止",
};

export const EXEC_STATE_CLS: Record<ExecState, string> = {
  completed: "bg-success/10 text-success border-success/30",
  running: "bg-info/10 text-info border-info/30",
  pending: "bg-primary/10 text-primary border-primary/30",
  aborted: "bg-destructive/10 text-destructive border-destructive/30",
};

export function getExecState(t: Pick<TaskRow, "status" | "aborted">): ExecState {
  if (t.aborted) return "aborted";
  if (t.status === "running") return "running";
  if (t.status === "pending") return "pending";
  return "completed";
}

export type TemplateStatus = "enabled" | "draft";
export type TemplateAction =
  | "like" | "comment" | "follow" | "post" | "addFriend" | "dm" | "share" | "view"
  | "sharePost" | "hidePost" | "deletePost" | "editProfile";

export const TEMPLATE_ACTION_LABEL: Record<TemplateAction, string> = {
  like: "点赞",
  comment: "评论",
  follow: "关注",
  post: "发帖",
  addFriend: "加好友",
  dm: "发私信",
  share: "转发/分享",
  view: "浏览/观看",
  sharePost: "转发贴文",
  hidePost: "隐藏贴文",
  deletePost: "删除贴文",
  editProfile: "修改账号基础信息",
};

export const TEMPLATE_ACTIONS: TemplateAction[] = [
  "like", "comment", "follow", "post", "addFriend", "dm", "share", "view",
  "sharePost", "hidePost", "deletePost", "editProfile",
];

export interface TaskTemplate {
  id: string;
  name: string;
  subtype: TaskSubType;
  platforms: Platform[];
  total: number;
  description: string;
  createdAt: string;
  uses: number;
  status?: TemplateStatus;
  agentName?: string;
  actions?: TemplateAction[];
  tags?: string[];
  monthlyUses?: number;
  /** 是否禁用「使用」功能（功能未实现时为 true） */
  useDisabled?: boolean;
  /** 任务类型（与任务列表统一口径） */
  category?: TaskCategory;
}

export const PLATFORMS: Platform[] = ["Facebook", "Tiktok", "WhatsApp", "Instagram", "Twitter/X"];

export const PLATFORM_CHIP: Record<Platform, string> = {
  Facebook: "bg-blue-500/10 text-blue-600 border-blue-300/40",
  Tiktok: "bg-foreground/10 text-foreground border-foreground/20",
  WhatsApp: "bg-emerald-500/10 text-emerald-600 border-emerald-300/40",
  Instagram: "bg-pink-500/10 text-pink-600 border-pink-300/40",
  "Twitter/X": "bg-sky-500/10 text-sky-600 border-sky-300/40",
};

export const SUBTYPE_LABEL: Record<TaskSubType, string> = {
  nurture: "周期性",
  action: "单次触达",
};

export const SUBTYPE_CLS: Record<TaskSubType, string> = {
  nurture: "bg-violet-500/10 text-violet-600 border-violet-300/40",
  action: "bg-amber-500/10 text-amber-600 border-amber-300/40",
};

/** 任务类型（全系统统一口径：任务列表 / 任务诊断中心共用） */
export type TaskCategory = "nurture" | "coview" | "social-reach" | "dm" | "account-ops";

/** 下拉与筛选的固定顺序 */
export const TASK_CATEGORY_ORDER: TaskCategory[] = [
  "nurture", "coview", "dm", "social-reach", "account-ops",
];

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  nurture: "养号任务",
  coview: "同屏任务",
  "social-reach": "社媒触达任务",
  dm: "私信任务",
  "account-ops": "内容运营任务",
};

/** 每种任务类型包含的动作（用于任务说明、mock 数据与诊断维度） */
export const TASK_CATEGORY_ACTIONS: Record<TaskCategory, string[]> = {
  nurture: ["点赞", "关注", "评论"],
  coview: ["同屏人工操作", "账号资料回填", "待办事项处置"],
  "social-reach": ["加好友", "关注"],
  dm: ["私信"],
  "account-ops": ["转发帖", "隐藏帖", "删帖", "修改账号信息", "发帖"],
};

export const TASK_CATEGORY_CLS: Record<TaskCategory, string> = {
  nurture: "bg-violet-500/10 text-violet-600 border-violet-300/40",
  coview: "bg-amber-500/10 text-amber-600 border-amber-300/40",
  "social-reach": "bg-teal-500/10 text-teal-600 border-teal-300/40",
  dm: "bg-indigo-500/10 text-indigo-600 border-indigo-300/40",
  "account-ops": "bg-sky-500/10 text-sky-600 border-sky-300/40",
};

export function getTaskCategory(t: Pick<TaskRow, "source" | "category">): TaskCategory {
  if (t.category) return t.category;
  // 私信台账归入「私信任务」；好友通过 / 拒绝台账归入「社媒触达任务」
  if (t.source === "dm") return "dm";
  if (t.source === "friend-approve" || t.source === "friend-reject") {
    return "social-reach";
  }
  return "nurture";
}



export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待执行",
  running: "执行中",
  success: "全部成功",
  failed: "全部失败",
  partial: "部分成功",
};

export const STATUS_CLS: Record<TaskStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  running: "bg-primary/10 text-primary border-primary/30",
  success: "bg-success/10 text-success border-success/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  partial: "bg-warning/10 text-warning border-warning/30",
};

/* ============================================================ */
/* 工具函数                                                     */
/* ============================================================ */

export const pad = (n: number) => n.toString().padStart(2, "0");
export const fmtNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
export const shortTime = (ts: string) => ts.slice(11, 16);
export const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
export const genTaskId = () => `2046834${String(Math.floor(Math.random() * 9e7) + 1e7)}`;

/* ============================================================ */
/* 自然语言解析                                                 */
/* ============================================================ */

export interface ParsedIntent {
  kind: "create" | "use_template" | "save_template" | "execute" | "smalltalk";
  platforms: Platform[];
  subtype: TaskSubType;
  total: number;
  templateName?: string;
  newTemplateName?: string;
  targetTaskId?: string;
}

export function parseUserMessage(text: string, templates: TaskTemplate[], lastTaskId?: string): ParsedIntent {
  const t = text.trim();
  const saveMatch = t.match(/保存(?:上一个|这个|刚才的)?(?:任务)?(?:为|成)模[版板](?:[，,。.\s]*(?:命名为|叫|名为|名称为)\s*[「""'']?([^「」""''\s，。,.]+))?/);
  if (saveMatch) {
    return { kind: "save_template", platforms: [], subtype: "action", total: 0, newTemplateName: saveMatch[1], targetTaskId: lastTaskId };
  }
  const useMatch = t.match(/(?:使用|用|套用|按照|根据)\s*[「""'']?([^「」""''\s，。,.]+?)[」""'']?\s*(?:任务)?模[版板]/);
  if (useMatch) {
    const name = useMatch[1];
    const tpl = templates.find((x) => x.name.includes(name) || name.includes(x.name));
    return { kind: "use_template", platforms: tpl?.platforms ?? [], subtype: tpl?.subtype ?? "action", total: tpl?.total ?? 10, templateName: tpl?.name ?? name };
  }
  const platforms: Platform[] = [];
  const platformAliases: Record<string, Platform> = {
    facebook: "Facebook", fb: "Facebook", "脸书": "Facebook",
    tiktok: "Tiktok", "抖音国际": "Tiktok",
    whatsapp: "WhatsApp", wa: "WhatsApp",
    instagram: "Instagram", ins: "Instagram", ig: "Instagram",
    twitter: "Twitter/X", x: "Twitter/X", "推特": "Twitter/X",
  };
  const lower = t.toLowerCase();
  for (const [k, v] of Object.entries(platformAliases)) {
    if (lower.includes(k) && !platforms.includes(v)) platforms.push(v);
  }
  const subtype: TaskSubType = /周期|养号|每天|每日|每周|定时|循环/.test(t) ? "nurture" : "action";
  let total = 10;
  const numMatch = t.match(/(\d+)\s*(?:条|个|次|账号)/);
  if (numMatch) total = parseInt(numMatch[1], 10);
  const looksLikeTask = /任务|发帖|互动|评论|点赞|私信|关注|养号|触达|发布|采集|执行/.test(t) || platforms.length > 0;
  if (looksLikeTask) {
    return { kind: "create", platforms: platforms.length ? platforms : ["Facebook"], subtype, total };
  }
  return { kind: "smalltalk", platforms: [], subtype: "action", total: 0 };
}

/* ============================================================ */
/* 初始数据                                                     */
/* ============================================================ */

/**
 * 同屏任务：一个社媒账号对应一个同屏任务。
 * 账号信息与「账号列表」mock（seedManagedAccounts）保持一致：
 * 账号索引 i → id `m-${i}`、平台 ID `1000123456 + i*7919`、头像 seed `managed-${i}`、
 * 租户 TASK_TENANTS[i % n]，避免两处数据对不上。
 */
const COVIEW_SEED: {
  i: number;
  username: string;
  platform: Platform;
  operator: string;
  purpose: string;
  createdAt: string;
  startTime?: string;
  endTime?: string;
  status: TaskStatus;
}[] = [
  { i: 2, username: "boo.daily", platform: "Instagram", operator: "李雨欣", purpose: "人工核实账号状态并回填账号资料", createdAt: "2026-06-03 09:30:00", startTime: "2026-06-03 09:31:12", endTime: "2026-06-03 09:52:40", status: "success" },
  { i: 3, username: "@boo_shorts", platform: "Twitter/X", operator: "李雨欣", purpose: "登录失败账号同屏复登并登记处置结果", createdAt: "2026-06-03 10:05:00", startTime: "2026-06-03 10:06:03", endTime: "2026-06-03 10:34:58", status: "success" },
  { i: 5, username: "@zhang_ip", platform: "Tiktok", operator: "陈晓明", purpose: "私信受限申诉同屏操作", createdAt: "2026-06-03 11:20:00", startTime: "2026-06-03 11:21:40", endTime: "2026-06-03 11:47:05", status: "success" },
  { i: 6, username: "海风出海", platform: "Instagram", operator: "王浩然", purpose: "同屏更新简介与联系方式", createdAt: "2026-06-04 09:10:00", startTime: "2026-06-04 09:12:22", endTime: "2026-06-04 09:28:16", status: "success" },
  { i: 8, username: "极客SaaS", platform: "Twitter/X", operator: "张梦琪", purpose: "风控账号同屏验证与安全设置检查", createdAt: "2026-06-04 14:00:00", startTime: "2026-06-04 14:02:31", endTime: "2026-06-04 14:41:09", status: "partial" },
  { i: 10, username: "星航跨境", platform: "Facebook", operator: "陈晓明", purpose: "待确认账号同屏核实与资料回填", createdAt: "2026-06-05 09:00:00", startTime: "2026-06-05 09:01:18", endTime: "2026-06-05 09:19:44", status: "success" },
  { i: 11, username: "Boo小宇", platform: "Tiktok", operator: "刘子轩", purpose: "评论受限处置与内容偏好调整", createdAt: "2026-06-05 10:30:00", startTime: "2026-06-05 10:32:07", endTime: "2026-06-05 11:05:33", status: "failed" },
  { i: 13, username: "DTC Brand", platform: "Twitter/X", operator: "黄雪", purpose: "同屏检查账号绑定信息", createdAt: "2026-06-05 15:40:00", startTime: "2026-06-05 15:41:55", status: "running" },
  { i: 15, username: "Lifestyle 365", platform: "Facebook", operator: "李雨欣", purpose: "PIN 校验后同屏恢复登录态", createdAt: "2026-06-06 09:20:00", startTime: "2026-06-06 09:21:36", status: "running" },
  { i: 16, username: "BeautyDaily", platform: "Tiktok", operator: "王浩然", purpose: "计划同屏巡检并回填地区与语言设置", createdAt: "2026-06-06 10:00:00", status: "pending" },
];

function buildCoviewTasks(): TaskRow[] {
  return COVIEW_SEED.map((s, idx) => {
    const tenant = TASK_TENANTS[idx % Math.max(1, TASK_TENANTS.length)];
    const done = s.status === "success" || s.status === "partial" ? 1 : 0;
    const failed = s.status === "failed" || s.status === "partial" ? 1 : 0;
    return {
      id: `2046834200000${String(idx + 1).padStart(2, "0")}`,
      name: `${s.platform} ${s.username} 账号同屏`,
      subtype: "action",
      platforms: [s.platform],
      total: 1,
      done,
      failed,
      status: s.status,
      category: "coview",
      description: `对托管账号「${s.username}」发起一次账号同屏，${s.purpose}。`,
      createdBy: s.operator,
      createdAt: s.createdAt,
      endTime: s.endTime,
      tenantId: tenant?.id,
      tenantName: tenant?.name,
      draft: {
        name: `${s.platform} ${s.username} 账号同屏`,
        platforms: [s.platform],
        coviewAccountId: `m-${s.i}`,
        coviewAccountName: s.username,
        coviewPlatform: s.platform,
        coviewPlatformId: `${1000123456 + s.i * 7919}`,
        coviewAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=managed-${s.i}`,
        coviewAction: "账号同屏",
        coviewPurpose: s.purpose,
        coviewOperator: s.operator,
        coviewStartTime: s.startTime ?? "",
        coviewEndTime: s.endTime ?? "",
        reachTags: [],
        reachAccounts: [`m-${s.i}`],
        postTags: [],
        postIds: [],
        execMode: s.status === "pending" ? "scheduled" : "now",
        ...(s.status === "pending"
          ? { scheduledDate: "2026-06-07", scheduledTime: "09:30" }
          : {}),
      },
    } as TaskRow;
  });
}

/* ---------- 内容运营任务（来源：Facebook / Tiktok 账号内容运营模版） ---------- */

/** 内容运营任务的结构化配置快照（与创建弹窗字段一致，用于详情展示） */
export interface ContentOpsInfo {
  /** 动作类型 */
  action: "sharePost" | "hidePost" | "deletePost" | "editProfile";
  /** 转发方式：immediate=立即分享/一键转发，timeline=分享到动态，group=分享到群组 */
  shareMode?: "immediate" | "timeline" | "group";
  /** 转发贴文链接 */
  sharePostLinks?: string[];
  /** 转发说明（Facebook）/ 转发附言（Tiktok） */
  shareNote?: string;
  /** 指定群组链接 */
  groupLinks?: string[];
  /** 删除/隐藏目标模式：specific=指定贴文，batch=按条件批量 */
  targetMode?: "specific" | "batch";
  /** 指定贴文模式下的归属账号用户名 */
  targetAccount?: string;
  /** 待删除/隐藏的贴文链接 */
  targetPostLinks?: string[];
  /** 批量模式：时间范围 */
  rangeStart?: string;
  rangeEnd?: string;
  keyword?: string;
  postType?: "all" | "original" | "repost";
  maxCount?: number;
  /** 修改账号基础信息：修改字段 */
  editFields?: string[];
}

interface ContentOpsSeed {
  name: string;
  platform: Platform;
  template: string;
  lines: string[];
  ops: ContentOpsInfo;
  total: number;
  done: number;
  failed: number;
  status: TaskStatus;
  operator: string;
  createdAt: string;
  endTime?: string;
  aborted?: boolean;
  accounts: string[];
}

const CONTENT_OPS_TPL_DESC: Record<string, string> = {
  "Facebook 账号内容运营": "对Facebook账号执行日常内容运营和维护。",
  "Tiktok 账号内容运营": "对Tiktok账号执行日常内容运营和维护。",
};

const CONTENT_OPS_SEED: ContentOpsSeed[] = [
  {
    name: "Facebook 品牌主帖一键转发",
    platform: "Facebook",
    template: "Facebook 账号内容运营",
    ops: {
      action: "sharePost",
      shareMode: "immediate",
      sharePostLinks: [
        "https://www.facebook.com/brand.official/posts/102301",
        "https://www.facebook.com/brand.official/posts/102298",
        "https://www.facebook.com/brand.official/posts/102275",
      ],
    },
    lines: ["指定动作：转发贴文", "转发方式：立即分享", "指定贴文：3 条", "执行方式：立即执行"],
    total: 12, done: 12, failed: 0, status: "success",
    operator: "黄雪", createdAt: "2026-08-18 09:20:00", endTime: "2026-08-18 09:58:22",
    accounts: ["m-1", "m-3", "m-5"],
  },
  {
    name: "Facebook 新品帖转发到动态",
    platform: "Facebook",
    template: "Facebook 账号内容运营",
    ops: {
      action: "sharePost",
      shareMode: "timeline",
      sharePostLinks: [
        "https://www.facebook.com/brand.official/posts/102356",
        "https://www.facebook.com/brand.official/posts/102341",
      ],
      shareNote: "新款 LED smart screen 到货，欢迎来店体验",
    },
    lines: [
      "指定动作：转发贴文",
      "转发方式：分享到动态",
      "指定贴文：2 条",
      "转发说明：新款 LED smart screen 到货，欢迎来店体验",
      "执行方式：立即执行",
    ],
    total: 10, done: 6, failed: 0, status: "running",
    operator: "陈晓明", createdAt: "2026-08-24 10:05:00",
    accounts: ["m-2", "m-4"],
  },
  {
    name: "Facebook 促销帖分享到群组",
    platform: "Facebook",
    template: "Facebook 账号内容运营",
    ops: {
      action: "sharePost",
      shareMode: "group",
      sharePostLinks: [
        "https://www.facebook.com/brand.official/posts/102410",
        "https://www.facebook.com/brand.official/posts/102405",
        "https://www.facebook.com/brand.official/posts/102390",
        "https://www.facebook.com/brand.official/posts/102388",
      ],
      groupLinks: ["https://www.facebook.com/groups/led.display.deals"],
    },
    lines: [
      "指定动作：转发贴文",
      "转发方式：分享到群组",
      "指定贴文：4 条",
      "指定群组链接：https://www.facebook.com/groups/led.display.deals",
      "执行方式：指定时间开始执行 2026-08-26 20:00",
    ],
    total: 15, done: 11, failed: 4, status: "partial",
    operator: "李雨欣", createdAt: "2026-08-26 20:00:00", endTime: "2026-08-26 21:12:40",
    accounts: ["m-6", "m-7", "m-8"],
  },
  {
    name: "Facebook 历史敏感帖批量隐藏",
    platform: "Facebook",
    template: "Facebook 账号内容运营",
    ops: {
      action: "hidePost",
      targetMode: "batch",
      rangeStart: "2026-03-01",
      rangeEnd: "2026-05-31",
      keyword: "clearance",
      postType: "all",
      maxCount: 50,
    },
    lines: [
      "指定动作：隐藏贴文",
      "目标模式：按条件批量",
      "隐藏范围：2026-03-01 至 2026-05-31",
      "关键词：clearance",
      "贴文类型：全部",
      "条数上限：50",
      "指定账号：8 个",
      "执行方式：立即执行",
    ],
    total: 8, done: 8, failed: 0, status: "success",
    operator: "黄雪", createdAt: "2026-08-28 14:00:00", endTime: "2026-08-28 14:41:05",
    accounts: ["m-1", "m-2", "m-9"],
  },
  {
    name: "Facebook 指定违规帖删除",
    platform: "Facebook",
    template: "Facebook 账号内容运营",
    ops: {
      action: "deletePost",
      targetMode: "specific",
      targetAccount: "olivia.hayes.mkt",
      targetPostLinks: [
        "https://www.facebook.com/olivia.hayes.mkt/posts/88210",
        "https://www.facebook.com/olivia.hayes.mkt/posts/88196",
      ],
    },
    lines: [
      "指定动作：删除贴文",
      "目标模式：指定贴文",
      "指定账号：olivia.hayes.mkt",
      "待删除贴文：2 条",
      "执行方式：立即执行",
    ],
    total: 2, done: 0, failed: 2, status: "failed",
    operator: "陈晓明", createdAt: "2026-09-01 11:30:00", endTime: "2026-09-01 11:33:18",
    accounts: ["m-4"],
  },
  {
    name: "Facebook 账号资料统一更新",
    platform: "Facebook",
    template: "Facebook 账号内容运营",
    ops: {
      action: "editProfile",
      editFields: ["nickname", "bio", "language"],
    },
    lines: [
      "指定动作：修改账号基础信息",
      "修改字段：账号昵称、个人简介、语言",
      "指定账号：6 个",
      "执行方式：指定时间开始执行（账号活跃时间）",
    ],
    total: 6, done: 0, failed: 0, status: "pending",
    operator: "李雨欣", createdAt: "2026-09-05 09:15:00",
    accounts: ["m-3", "m-5", "m-10"],
  },
  {
    name: "Tiktok 爆款视频一键转发",
    platform: "Tiktok",
    template: "Tiktok 账号内容运营",
    ops: {
      action: "sharePost",
      shareMode: "immediate",
      sharePostLinks: [
        "https://www.tiktok.com/@game.setup.lab/video/74102301",
        "https://www.tiktok.com/@game.setup.lab/video/74102255",
        "https://www.tiktok.com/@game.setup.lab/video/74102198",
      ],
      shareNote: "Game console setup upgrade, worth a look!",
    },
    lines: [
      "指定动作：转发贴文",
      "转发方式：一键转发",
      "指定贴文：3 条",
      "转发附言：Game console setup upgrade, worth a look!",
      "执行方式：立即执行",
    ],
    total: 10, done: 10, failed: 0, status: "success",
    operator: "黄雪", createdAt: "2026-08-30 10:00:00", endTime: "2026-08-30 10:36:44",
    accounts: ["m-11", "m-12"],
  },
  {
    name: "Tiktok 粉丝群内容分发",
    platform: "Tiktok",
    template: "Tiktok 账号内容运营",
    ops: {
      action: "sharePost",
      shareMode: "group",
      sharePostLinks: [
        "https://www.tiktok.com/@game.setup.lab/video/74103312",
        "https://www.tiktok.com/@game.setup.lab/video/74103280",
      ],
    },
    lines: [
      "指定动作：转发贴文",
      "转发方式：分享到群组",
      "指定贴文：2 条",
      "执行方式：立即执行",
    ],
    total: 9, done: 4, failed: 1, status: "running",
    operator: "陈晓明", createdAt: "2026-09-03 15:20:00",
    accounts: ["m-13", "m-14"],
  },
  {
    name: "Tiktok 过期活动视频批量删除",
    platform: "Tiktok",
    template: "Tiktok 账号内容运营",
    ops: {
      action: "deletePost",
      targetMode: "batch",
      rangeStart: "2026-06-01",
      rangeEnd: "2026-07-31",
      keyword: "summer sale",
      postType: "original",
      maxCount: 30,
    },
    lines: [
      "指定动作：删除贴文",
      "目标模式：按条件批量",
      "删除范围：2026-06-01 至 2026-07-31",
      "关键词：summer sale",
      "贴文类型：原创",
      "条数上限：30",
      "指定账号：7 个",
      "执行方式：立即执行",
    ],
    total: 7, done: 5, failed: 2, status: "partial",
    operator: "李雨欣", createdAt: "2026-09-06 09:40:00", endTime: "2026-09-06 10:22:03",
    accounts: ["m-15", "m-16"],
  },
  {
    name: "Tiktok 指定视频隐藏（手动终止）",
    platform: "Tiktok",
    template: "Tiktok 账号内容运营",
    ops: {
      action: "hidePost",
      targetMode: "specific",
      targetAccount: "mia.tt.official",
      targetPostLinks: [
        "https://www.tiktok.com/@mia.tt.official/video/74099871",
        "https://www.tiktok.com/@mia.tt.official/video/74099652",
        "https://www.tiktok.com/@mia.tt.official/video/74099318",
      ],
    },
    lines: [
      "指定动作：隐藏贴文",
      "目标模式：指定贴文",
      "指定账号：mia.tt.official",
      "待隐藏贴文：3 条",
      "执行方式：立即执行",
    ],
    total: 3, done: 1, failed: 0, status: "running", aborted: true,
    operator: "黄雪", createdAt: "2026-09-08 16:10:00",
    accounts: ["m-17"],
  },
  {
    name: "Tiktok 账号简介与地区调整",
    platform: "Tiktok",
    template: "Tiktok 账号内容运营",
    ops: {
      action: "editProfile",
      editFields: ["displayName", "bio", "region"],
    },
    lines: [
      "指定动作：修改账号基础信息",
      "修改字段：账号显示名、个人简介、地区",
      "指定账号：5 个",
      "执行方式：指定时间开始执行 2026-09-12 09:00",
    ],
    total: 5, done: 0, failed: 0, status: "pending",
    operator: "陈晓明", createdAt: "2026-09-09 17:05:00",
    accounts: ["m-18", "m-19"],
  },
];

function buildContentOpsTasks(): TaskRow[] {
  return CONTENT_OPS_SEED.map((s, idx) => {
    const tenant = TASK_TENANTS[idx % Math.max(1, TASK_TENANTS.length)];
    const desc = [
      `来源模版：${s.template}任务`,
      CONTENT_OPS_TPL_DESC[s.template] ?? "",
      ...s.lines,
    ]
      .filter(Boolean)
      .join("\n");
    const execLine = s.lines[s.lines.length - 1] ?? "";
    const scheduled = execLine.includes("指定时间");
    return {
      id: `2046834300000${String(idx + 1).padStart(2, "0")}`,
      name: s.name,
      subtype: "action",
      platforms: [s.platform],
      total: s.total,
      done: s.done,
      failed: s.failed,
      status: s.status,
      category: "account-ops",
      description: desc,
      createdBy: s.operator,
      createdAt: s.createdAt,
      endTime: s.endTime,
      aborted: s.aborted,
      fromTemplate: s.template,
      tenantId: tenant?.id,
      tenantName: tenant?.name,
      draft: {
        name: s.name,
        platforms: [s.platform],
        reachTags: [],
        reachAccounts: s.accounts,
        postTags: [],
        postIds: [],
        contentOps: s.ops,
        execMode: scheduled ? "scheduled" : "now",
        ...(scheduled ? { scheduledDate: "2026-09-12", scheduledTime: "09:00" } : {}),
      },
    } as TaskRow;
  });
}



/* ============================================================ */
/* 社媒触达任务（社媒拓客）预置数据                              */
/* ------------------------------------------------------------ */
/* 口径与「创建社媒拓客任务」保持一致：                            */
/*  · 平台动作：Facebook = 加好友，Tiktok = 关注                  */
/*  · 寻找目标方式：系统智能搜索 / 指定贴文搜索 / 指定群组搜索      */
/*  · 每账号每日触达上限固定 5，执行方式固定为「周期(每日)」        */
/* ============================================================ */

/** 寻找目标方式 */
export type ReachFindMode = "smart" | "post" | "group";
export const REACH_FIND_MODE_LABEL: Record<ReachFindMode, string> = {
  smart: "系统智能搜索",
  post: "指定贴文搜索",
  group: "指定群组搜索",
};
/** 触达任务执行方式（当前仅支持周期执行，频率每日） */
export const REACH_EXEC_LABEL = "周期(每日)";
/** 每个账号每日触达上限 */
export const REACH_DAILY_PER_ACCOUNT = 5;

interface ReachSeed {
  platform: Extract<Platform, "Facebook" | "Tiktok">;
  name: string;
  region: string;
  products: string[];
  keywords: string[];
  findMode: ReachFindMode;
  links?: string[];
  activeWindow: string;
  targetCap: number;
  accounts: number;
  lang: string;
  scriptZh: string;
  scriptSend: string;
  operator: string;
  status: TaskStatus;
  done: number;
  failed: number;
  replies: number;
  createdAt: string;
  startTime: string;
  endTime?: string;
  /** 私信任务：动作为「私信」，归入「私信任务」类型 */
  dm?: boolean;
}

const REACH_SEED: ReachSeed[] = [
  // ---------------- Facebook · 加好友 ----------------
  {
    platform: "Facebook", name: "Facebook 美国钢材进口商拓客", region: "美国",
    products: ["建筑螺纹钢", "彩涂钢卷"], keywords: ["steel importer", "structural steel", "rebar supplier"],
    findMode: "smart", activeWindow: "近两周", targetCap: 30, accounts: 3, lang: "en",
    scriptZh: "Hi {联系人名}，我是 {我的公司} 的 {我的姓名}，看到您在美国做钢材进口业务，方便聊聊供货与报价吗？",
    scriptSend: "Hi {联系人名}, I'm {我的姓名} from {我的公司}. Noticed you source structural steel in the US — happy to share our latest quote.",
    operator: "李雨欣", status: "running", done: 21, failed: 2, replies: 6,
    createdAt: "2026-06-01 09:20:00", startTime: "2026-06-01 09:30:00",
  },
  {
    platform: "Facebook", name: "Facebook 德国光伏支架采购拓客", region: "德国",
    products: ["光伏支架", "工业铝型材"], keywords: ["solar mounting", "pv bracket", "aluminium profile"],
    findMode: "group", links: ["https://www.facebook.com/groups/solarinstallers.de", "https://www.facebook.com/groups/pv.europe"],
    activeWindow: "近一个月", targetCap: 40, accounts: 4, lang: "en",
    scriptZh: "Hi {联系人名}，我们做光伏支架与铝型材出口，欧洲项目交付经验丰富，方便发一份规格与报价表吗？",
    scriptSend: "Hi {联系人名}, we manufacture PV mounting brackets and aluminium profiles with EU project experience — may I send you our spec sheet?",
    operator: "陈晓明", status: "partial", done: 33, failed: 7, replies: 9,
    createdAt: "2026-05-28 10:00:00", startTime: "2026-05-28 10:05:00", endTime: "2026-06-04 13:59:59",
  },
  {
    platform: "Facebook", name: "Facebook 英国跨境物流潜客私信触达", region: "英国", dm: true,
    products: ["跨境物流服务"], keywords: ["freight forwarder", "cross border logistics", "warehouse uk"],
    findMode: "post", links: ["https://www.facebook.com/ukfreight/posts/1024578899"],
    activeWindow: "近一周", targetCap: 25, accounts: 2, lang: "en",
    scriptZh: "Hi {联系人名}，看到您在讨论英国海外仓，我们提供中英专线与本地派送，方便交流一下吗？",
    scriptSend: "Hi {联系人名}, saw your post about UK warehousing. We run CN–UK line-haul with local delivery — open to a quick chat?",
    operator: "黄雪", status: "success", done: 25, failed: 0, replies: 8,
    createdAt: "2026-05-25 09:00:00", startTime: "2026-05-25 09:10:00", endTime: "2026-05-31 13:59:59",
  },
  {
    platform: "Facebook", name: "Facebook 巴西建材经销商拓客", region: "巴西",
    products: ["建筑螺纹钢"], keywords: ["material de construção", "aço importador", "distribuidor"],
    findMode: "smart", activeWindow: "近三个月", targetCap: 50, accounts: 5, lang: "pt",
    scriptZh: "Hi {联系人名}，我们是螺纹钢生产商，长期供货巴西建材经销商，方便看看我们的报价吗？",
    scriptSend: "Olá {联系人名}, somos fabricantes de vergalhões com fornecimento regular ao Brasil. Posso enviar nossa cotação?",
    operator: "王浩然", status: "running", done: 18, failed: 4, replies: 3,
    createdAt: "2026-06-03 14:00:00", startTime: "2026-06-03 14:20:00",
  },
  {
    platform: "Facebook", name: "Facebook 日本美妆分销商私信触达", region: "日本", dm: true,
    products: ["护肤精华", "美妆彩盘"], keywords: ["化粧品 卸", "スキンケア 仕入れ", "美容 代理店"],
    findMode: "group", links: ["https://www.facebook.com/groups/jp.beauty.wholesale"],
    activeWindow: "近两周", targetCap: 30, accounts: 3, lang: "ja",
    scriptZh: "Hi {联系人名}，我们做护肤精华与彩妆代工出口，方便发一份产品目录给您吗？",
    scriptSend: "{联系人名}様、スキンケア・メイク製品のOEM輸出を行っております。カタログをお送りしてもよろしいでしょうか。",
    operator: "张梦琪", status: "pending", done: 0, failed: 0, replies: 0,
    createdAt: "2026-06-06 09:40:00", startTime: "2026-06-07 09:00:00",
  },
  {
    platform: "Facebook", name: "Facebook 东南亚智能家居代理拓客", region: "印度尼西亚",
    products: ["智能家居套装"], keywords: ["smart home distributor", "iot reseller", "grosir smart home"],
    findMode: "smart", activeWindow: "近一个月", targetCap: 35, accounts: 3, lang: "en",
    scriptZh: "Hi {联系人名}，我们提供智能家居整套方案，正在寻找印尼本地代理，方便聊聊合作吗？",
    scriptSend: "Hi {联系人名}, we supply complete smart home kits and are looking for local partners in Indonesia — open to a chat?",
    operator: "李雨欣", status: "partial", done: 26, failed: 9, replies: 5,
    createdAt: "2026-05-30 11:00:00", startTime: "2026-05-30 11:15:00", endTime: "2026-06-05 13:59:59",
  },
  {
    platform: "Facebook", name: "Facebook 越南工业铝型材拓客", region: "越南",
    products: ["工业铝型材"], keywords: ["nhôm công nghiệp", "aluminium supplier", "nhà phân phối"],
    findMode: "post", links: ["https://www.facebook.com/vnindustry/posts/883421177", "https://www.facebook.com/aluvn/posts/771120934"],
    activeWindow: "近两周", targetCap: 28, accounts: 2, lang: "vi",
    scriptZh: "Hi {联系人名}，我们供应工业铝型材，可按图纸开模，方便发一份规格给您吗？",
    scriptSend: "Chào {联系人名}, chúng tôi cung cấp nhôm định hình công nghiệp theo bản vẽ. Tôi gửi bảng quy cách nhé?",
    operator: "刘子轩", status: "failed", done: 0, failed: 12, replies: 0,
    createdAt: "2026-06-02 15:30:00", startTime: "2026-06-02 15:40:00", endTime: "2026-06-03 13:59:59",
  },
  {
    platform: "Facebook", name: "Facebook 韩国美妆买手私信跟进", region: "韩国", dm: true,
    products: ["美妆彩盘"], keywords: ["뷰티 바이어", "화장품 도매", "beauty buyer"],
    findMode: "smart", activeWindow: "近一周", targetCap: 20, accounts: 2, lang: "en",
    scriptZh: "Hi {联系人名}，我们是彩妆工厂，支持小批量定制，方便看看我们的爆款清单吗？",
    scriptSend: "Hi {联系人名}, we're a color cosmetics factory supporting small-batch OEM — may I share our best-seller list?",
    operator: "黄雪", status: "success", done: 20, failed: 0, replies: 7,
    createdAt: "2026-05-26 10:20:00", startTime: "2026-05-26 10:30:00", endTime: "2026-05-30 13:59:59",
  },
  {
    platform: "Facebook", name: "Facebook 泰国建材群组拓客", region: "泰国",
    products: ["彩涂钢卷", "建筑螺纹钢"], keywords: ["วัสดุก่อสร้าง", "steel coil", "โรงงานเหล็ก"],
    findMode: "group", links: ["https://www.facebook.com/groups/th.construction.material"],
    activeWindow: "近三个月", targetCap: 32, accounts: 3, lang: "th",
    scriptZh: "Hi {联系人名}，我们供应彩涂钢卷与螺纹钢，泰国客户交付稳定，方便聊聊吗？",
    scriptSend: "สวัสดีค่ะ {联系人名} เราจำหน่ายเหล็กม้วนเคลือบสีและเหล็กเส้น ส่งลูกค้าไทยเป็นประจำ สนใจพูดคุยไหมคะ",
    operator: "陈晓明", status: "running", done: 12, failed: 1, replies: 2,
    createdAt: "2026-06-05 09:00:00", startTime: "2026-06-05 09:20:00",
  },
  {
    platform: "Facebook", name: "Facebook 全球外贸潜客常态拓客", region: "全球",
    products: ["跨境物流服务", "工业铝型材"], keywords: ["import export", "sourcing agent", "b2b trade"],
    findMode: "smart", activeWindow: "近半年", targetCap: 60, accounts: 6, lang: "en",
    scriptZh: "Hi {联系人名}，我们是外贸供应链服务商，涵盖采购与物流，方便交换一下需求吗？",
    scriptSend: "Hi {联系人名}, we provide sourcing and logistics for cross-border trade — happy to exchange notes on your needs.",
    operator: "王浩然", status: "running", done: 41, failed: 5, replies: 12,
    createdAt: "2026-05-20 08:30:00", startTime: "2026-05-20 09:00:00",
  },
  // ---------------- Tiktok · 关注 ----------------
  {
    platform: "Tiktok", name: "Tiktok 美国美妆达人关注拓客", region: "美国",
    products: ["护肤精华", "美妆彩盘"], keywords: ["skincare routine", "makeup haul", "beauty creator"],
    findMode: "smart", activeWindow: "近一周", targetCap: 40, accounts: 4, lang: "en",
    scriptZh: "Hi {联系人名}，你的美妆内容很棒，我们是护肤精华品牌，想寄样合作，方便聊聊吗？",
    scriptSend: "Hi {联系人名}, love your beauty content! We're a skincare brand and would love to send you samples — open to collab?",
    operator: "黄雪", status: "running", done: 28, failed: 3, replies: 9,
    createdAt: "2026-06-01 10:10:00", startTime: "2026-06-01 10:20:00",
  },
  {
    platform: "Tiktok", name: "Tiktok 英国家居好物达人拓客", region: "英国",
    products: ["智能家居套装"], keywords: ["home gadgets", "smart home uk", "amazon finds"],
    findMode: "post", links: ["https://www.tiktok.com/@homehacks.uk/video/7391123456789012345"],
    activeWindow: "近两周", targetCap: 30, accounts: 3, lang: "en",
    scriptZh: "Hi {联系人名}，看到你分享的家居好物视频，我们有智能家居新品想寄给你体验。",
    scriptSend: "Hi {联系人名}, saw your home gadget video — we'd love to send you our new smart home kit to try.",
    operator: "李雨欣", status: "success", done: 30, failed: 0, replies: 11,
    createdAt: "2026-05-24 09:30:00", startTime: "2026-05-24 09:40:00", endTime: "2026-05-29 13:59:59",
  },
  {
    platform: "Tiktok", name: "Tiktok 日本护肤达人私信邀约", region: "日本", dm: true,
    products: ["护肤精华"], keywords: ["スキンケア", "美容垢", "コスメ紹介"],
    findMode: "smart", activeWindow: "近一个月", targetCap: 35, accounts: 3, lang: "ja",
    scriptZh: "Hi {联系人名}，我们是护肤品牌，想邀请你试用新品并合作内容。",
    scriptSend: "{联系人名}さん、スキンケアブランドです。新商品のご提供とコラボのご相談をさせてください。",
    operator: "张梦琪", status: "partial", done: 24, failed: 8, replies: 4,
    createdAt: "2026-05-29 14:00:00", startTime: "2026-05-29 14:10:00", endTime: "2026-06-04 13:59:59",
  },
  {
    platform: "Tiktok", name: "Tiktok 泰国穿搭达人关注拓客", region: "泰国",
    products: ["美妆彩盘"], keywords: ["แฟชั่น", "รีวิวเครื่องสำอาง", "ootd thailand"],
    findMode: "smart", activeWindow: "近两周", targetCap: 25, accounts: 2, lang: "th",
    scriptZh: "Hi {联系人名}，喜欢你的穿搭与美妆内容，我们想邀请你合作新品彩盘。",
    scriptSend: "สวัสดีค่ะ {联系人名} ชอบคอนเทนต์แฟชั่นและเมคอัพของคุณมาก อยากชวนร่วมงานพาเลตต์ใหม่ค่ะ",
    operator: "刘子轩", status: "pending", done: 0, failed: 0, replies: 0,
    createdAt: "2026-06-06 11:00:00", startTime: "2026-06-07 10:00:00",
  },
  {
    platform: "Tiktok", name: "Tiktok 越南电商小店私信触达", region: "越南", dm: true,
    products: ["跨境物流服务"], keywords: ["tiktok shop", "bán hàng online", "dropshipping"],
    findMode: "post", links: ["https://www.tiktok.com/@shopvn/video/7385566778899001122", "https://www.tiktok.com/@logisticsvn/video/7386677889900112233"],
    activeWindow: "近一周", targetCap: 30, accounts: 3, lang: "vi",
    scriptZh: "Hi {联系人名}，我们提供中越专线物流，适合 TikTok Shop 卖家，方便聊聊吗？",
    scriptSend: "Chào {联系人名}, chúng tôi có tuyến vận chuyển Trung–Việt phù hợp cho người bán TikTok Shop. Trao đổi thêm nhé?",
    operator: "陈晓明", status: "running", done: 15, failed: 2, replies: 3,
    createdAt: "2026-06-04 09:50:00", startTime: "2026-06-04 10:00:00",
  },
  {
    platform: "Tiktok", name: "Tiktok 韩国美妆测评号拓客", region: "韩国",
    products: ["美妆彩盘", "护肤精华"], keywords: ["뷰티리뷰", "화장품 추천", "kbeauty"],
    findMode: "smart", activeWindow: "近三个月", targetCap: 45, accounts: 4, lang: "en",
    scriptZh: "Hi {联系人名}，我们是彩妆品牌，想邀请你做新品测评合作。",
    scriptSend: "Hi {联系人名}, we're a cosmetics brand and would love to partner with you on a new product review.",
    operator: "王浩然", status: "success", done: 45, failed: 0, replies: 14,
    createdAt: "2026-05-22 10:00:00", startTime: "2026-05-22 10:15:00", endTime: "2026-05-31 13:59:59",
  },
  {
    platform: "Tiktok", name: "Tiktok 印尼母婴内容达人拓客", region: "印度尼西亚",
    products: ["智能家居套装"], keywords: ["ibu rumah tangga", "review produk", "smart home id"],
    findMode: "smart", activeWindow: "近两周", targetCap: 28, accounts: 2, lang: "en",
    scriptZh: "Hi {联系人名}，我们的智能家居产品适合家庭场景，想邀请你体验并共创内容。",
    scriptSend: "Hi {联系人名}, our smart home products fit family life — would you like to try them and co-create content?",
    operator: "黄雪", status: "failed", done: 0, failed: 9, replies: 0,
    createdAt: "2026-06-02 13:20:00", startTime: "2026-06-02 13:30:00", endTime: "2026-06-03 13:59:59",
  },
  {
    platform: "Tiktok", name: "Tiktok 巴西健身达人关注拓客", region: "巴西",
    products: ["智能家居套装"], keywords: ["fitness brasil", "treino em casa", "review"],
    findMode: "post", links: ["https://www.tiktok.com/@fitbrasil/video/7388899001122334455"],
    activeWindow: "近一个月", targetCap: 32, accounts: 3, lang: "pt",
    scriptZh: "Hi {联系人名}，我们做家庭智能设备，想邀请你做居家场景内容合作。",
    scriptSend: "Olá {联系人名}, trabalhamos com dispositivos inteligentes para casa e queremos convidá-lo para uma parceria de conteúdo.",
    operator: "张梦琪", status: "partial", done: 20, failed: 6, replies: 4,
    createdAt: "2026-05-31 15:00:00", startTime: "2026-05-31 15:10:00", endTime: "2026-06-05 13:59:59",
  },
  {
    platform: "Tiktok", name: "Tiktok 德国工业内容账号拓客", region: "德国",
    products: ["工业铝型材", "光伏支架"], keywords: ["industrie", "solar diy", "aluminium profil"],
    findMode: "smart", activeWindow: "近半年", targetCap: 22, accounts: 2, lang: "en",
    scriptZh: "Hi {联系人名}，我们生产铝型材与光伏支架，想在你的内容里做产品露出，方便聊聊吗？",
    scriptSend: "Hi {联系人名}, we manufacture aluminium profiles and PV brackets — interested in a product feature collaboration?",
    operator: "刘子轩", status: "running", done: 9, failed: 1, replies: 1,
    createdAt: "2026-06-05 16:00:00", startTime: "2026-06-05 16:10:00",
  },
  {
    platform: "Tiktok", name: "Tiktok 全球好物达人常态私信", region: "全球", dm: true,
    products: ["护肤精华", "智能家居套装", "美妆彩盘"], keywords: ["tiktokmademebuyit", "product review", "unboxing"],
    findMode: "smart", activeWindow: "近三个月", targetCap: 60, accounts: 5, lang: "en",
    scriptZh: "Hi {联系人名}，我们有多条产品线在找达人合作，方便聊聊寄样与佣金吗？",
    scriptSend: "Hi {联系人名}, we have several product lines looking for creators — happy to discuss samples and commission.",
    operator: "李雨欣", status: "running", done: 37, failed: 4, replies: 10,
    createdAt: "2026-05-18 09:00:00", startTime: "2026-05-18 09:30:00",
  },
];

function buildReachTasks(): TaskRow[] {
  return REACH_SEED.map((s, idx) => {
    const tenant = TASK_TENANTS[idx % Math.max(1, TASK_TENANTS.length)];
    const action = s.dm ? "私信" : s.platform === "Facebook" ? "加好友" : "关注";
    const findLabel = REACH_FIND_MODE_LABEL[s.findMode];
    const accountCount = s.dm ? 1 : s.accounts;
    return {
      id: `2046834500000${String(idx + 1).padStart(2, "0")}`,
      name: s.name,
      subtype: "action",
      platforms: [s.platform],
      total: s.targetCap,
      done: s.done,
      failed: s.failed,
      status: s.status,
      category: s.dm ? "dm" : "social-reach",
      description: s.dm
        ? `在 ${s.platform} 向指定目标账号发送私信，由 1 个托管账号立即执行。`
        : `在 ${s.platform} 面向${s.region}，以${findLabel}寻找「${s.keywords.join("、")}」相关目标账号，用 ${accountCount} 个托管账号执行${action}触达，目标上限 ${s.targetCap} 个，每账号每日 ${REACH_DAILY_PER_ACCOUNT} 个。`,
      createdBy: s.operator,
      createdAt: s.createdAt,
      endTime: s.endTime,
      tenantId: tenant?.id,
      tenantName: tenant?.name,
      draft: {
        name: s.name,
        platforms: [s.platform],
        reachAction: action,
        reachRegion: s.region,
        reachProducts: s.products,
        reachKeywords: s.keywords.join(", "),
        reachFindMode: s.findMode,
        reachLinks: s.links ?? [],
        reachActiveWindow: s.activeWindow,
        reachTargetCap: s.targetCap,
        reachDailyPerAccount: REACH_DAILY_PER_ACCOUNT,
        reachAccountCount: accountCount,
        reachAccounts: managedIdsForPlatform(s.platform, accountCount),
        reachTags: [],
        postTags: [],
        postIds: [],
        replies: s.replies,
        scriptZh: s.scriptZh,
        scriptTargetLang: s.lang,
        scriptSend: s.scriptSend,
        execMode: s.dm ? "now" : "recurring",
        executionTime: s.startTime,
        recurFreq: "daily",
        recurStartDate: s.startTime.slice(0, 10),
        recurStartTime: s.startTime.slice(11, 16),
        recurDeadline: s.endTime ?? "",
      },
    } as TaskRow;
  });
}

const initialTasks: TaskRow[] = ([
  {
    id: "204683410000001",
    name: "Facebook 周末互动养号",
    subtype: "nurture",
    platforms: ["Facebook"],
    total: 12, done: 12, failed: 0,
    status: "success",
    description: "对 Facebook 上 12 个种子账号执行 7 天周期的轻量互动，每日点赞 5、评论 2。",
    createdBy: "黄雪",
    createdAt: "2026-05-24 10:12:08",
    endTime: "2026-05-24 11:30:42",
    fromTemplate: "Facebook 日常养号",
    draft: {
      name: "Facebook 周末互动养号",
      platforms: ["Facebook"],
      targetMode: "keyword",
      targetKeyword: "旅游、旅游达人的账号",
      targetUrl: "",
      reachTags: ["主账号", "高活跃"],
      reachAccounts: managedIdsForPlatform("Facebook", 12),
      postTags: [],
      postIds: [],
      execMode: "recurring",
      recurStartDate: "2026-05-24",
      recurStartTime: "09:00",
      recurFreq: "daily",
      recurTimeStart: "09:00",
      recurTimeEnd: "18:00",
      sessionDuration: 30,
      sessionDurationUnit: "min",
      recurDuration: 7,
      recurForever: false,
      nurtureGroups: [
        {
          id: "ng_mock_001_1",
          nurtureInterestKeywords: "travel；travel blogger；weekend getaway",
          nurtureLike: true, nurtureLikeMin: 40, nurtureLikeMax: 70,
          nurtureFollow: false, nurtureFollowMin: 0, nurtureFollowMax: 20,
          nurtureComment: true, nurtureCommentMin: 20, nurtureCommentMax: 40,
          nurtureCommentEmoji: true,
          nurtureCommentTopic: "",
          nurtureCommentSentiment: "positive",
          nurtureCommentStyle: "casual",
          nurtureSearch: true, nurtureKeywordOn: true,
          nurtureKeywords: "travel vlog；weekend trip；hidden gems",
        },
      ],
    },
  },
  {
    id: "204683410000006",
    name: "Tiktok 周期性养号互动",
    subtype: "nurture",
    platforms: ["Tiktok"],
    total: 15, done: 0, failed: 0,
    status: "pending",
    description: "对 15 个 Tiktok 种子账号开启 14 天周期养号，每日浏览 10、点赞 4、评论 1。",
    createdBy: "黄雪",
    createdAt: "2026-05-28 09:42:08",
    fromTemplate: "Tiktok 日常养号",
    draft: {
      name: "Tiktok 周期性养号互动",
      platforms: ["Tiktok"],
      targetMode: "random",
      targetKeyword: "",
      targetUrl: "",
      reachTags: ["主账号", "高活跃"],
      reachAccounts: managedIdsForPlatform("Tiktok", 10),
      postTags: [],
      postIds: [],
      execMode: "recurring",
      recurStartDate: "2026-05-28",
      recurStartTime: "10:00",
      recurFreq: "daily",
      recurTimeStart: "10:00",
      recurTimeEnd: "20:00",
      sessionDuration: 45,
      sessionDurationUnit: "min",
      recurDuration: 14,
      recurForever: false,
      nurtureGroups: [
        {
          id: "ng_mock_006_1",
          nurtureInterestKeywords: "beauty；skincare；makeup tutorial",
          nurtureLike: true, nurtureLikeMin: 30, nurtureLikeMax: 60,
          nurtureFollow: true, nurtureFollowMin: 5, nurtureFollowMax: 15,
          nurtureComment: true, nurtureCommentMin: 15, nurtureCommentMax: 30,
          nurtureCommentEmoji: true,
          nurtureCommentTopic: "",
          nurtureCommentSentiment: "positive",
          nurtureCommentStyle: "enthusiastic",
          nurtureSearch: true, nurtureKeywordOn: true,
          nurtureKeywords: "skincare routine；beauty hacks；GRWM",
        },
        {
          id: "ng_mock_006_2",
          nurtureInterestKeywords: "fashion；OOTD；street style",
          nurtureLike: true, nurtureLikeMin: 40, nurtureLikeMax: 60,
          nurtureFollow: false, nurtureFollowMin: 0, nurtureFollowMax: 10,
          nurtureComment: false, nurtureCommentMin: 0, nurtureCommentMax: 10,
          nurtureCommentEmoji: false,
          nurtureCommentTopic: "",
          nurtureCommentSentiment: "",
          nurtureCommentStyle: "",
          nurtureSearch: true, nurtureKeywordOn: true,
          nurtureKeywords: "OOTD；fashion haul；outfit ideas",
        },
      ],
    },
  },
  {
    id: "204683410000007",
    name: "Facebook 日常养号 · 持续运行",
    subtype: "nurture",
    platforms: ["Facebook"],
    // 持续运行任务：total 为「截至当前已下发的子任务数」，成功 + 失败 + 进行中 = total
    total: 140, done: 132, failed: 4,
    status: "running",
    description: "对 20 个 Facebook 种子账号开启持续养号，持续执行直到手动停止。",
    createdBy: "黄雪",
    createdAt: "2026-05-22 08:30:00",
    fromTemplate: "Facebook 日常养号",
    draft: {
      name: "Facebook 日常养号 · 持续运行",
      platforms: ["Facebook"],
      targetMode: "random",
      reachTags: ["主账号", "高活跃"],
      reachAccounts: managedIdsForPlatform("Facebook", 8),
      postTags: [],
      postIds: [],
      execMode: "recurring",
      recurStartDate: "2026-05-22",
      recurStartTime: "08:30",
      recurFreq: "daily",
      recurTimeStart: "08:30",
      recurTimeEnd: "22:00",
      sessionDuration: 30,
      sessionDurationUnit: "min",
      recurDuration: 0,
      recurForever: true,
      nurtureGroups: [
        {
          id: "ng_mock_007_1",
          nurtureInterestKeywords: "LED screen；digital devices；game console",
          nurtureLike: true, nurtureLikeMin: 50, nurtureLikeMax: 80,
          nurtureFollow: true, nurtureFollowMin: 10, nurtureFollowMax: 20,
          nurtureComment: true, nurtureCommentMin: 20, nurtureCommentMax: 40,
          nurtureCommentEmoji: true,
          nurtureCommentTopic: "",
          nurtureCommentSentiment: "positive",
          nurtureCommentStyle: "casual",
          nurtureSearch: true, nurtureKeywordOn: true,
          nurtureKeywords: "smart LED screen review；gadget unboxing；console gaming setup",
        },
        {
          id: "ng_mock_007_2",
          nurtureInterestKeywords: "knitwear；home decor；coffee",
          nurtureLike: true, nurtureLikeMin: 30, nurtureLikeMax: 50,
          nurtureFollow: false, nurtureFollowMin: 0, nurtureFollowMax: 15,
          nurtureComment: true, nurtureCommentMin: 10, nurtureCommentMax: 25,
          nurtureCommentEmoji: false,
          nurtureCommentTopic: "",
          nurtureCommentSentiment: "neutral",
          nurtureCommentStyle: "question",
          nurtureSearch: true, nurtureKeywordOn: true,
          nurtureKeywords: "cozy knitwear；home decor ideas；coffee brewing",
        },
      ],
    },
  },
  ...buildReachTasks(),
  ...buildCoviewTasks(),
  ...buildContentOpsTasks(),

] as TaskRow[]).map((t, i) => {
  if (t.tenantId) return t;
  const tenant = TASK_TENANTS[i % Math.max(1, TASK_TENANTS.length)];
  return tenant ? { ...t, tenantId: tenant.id, tenantName: tenant.name } : t;
});

export function isForeverTask(t: Pick<TaskRow, "draft">): boolean {
  const d = (t.draft ?? {}) as Record<string, unknown>;
  return d.execMode === "recurring" && d.recurForever === true;
}

const initialTemplates: TaskTemplate[] = [
  {
    id: uid("tpl"),
    name: "Facebook 日常养号",
    subtype: "nurture",
    platforms: ["Facebook"],
    total: 10,
    description: "对 Facebook 账号执行轻量互动，每日点赞、关注与少量评论。",
    createdAt: "2026-05-10 09:00:00",
    uses: 18,
    status: "enabled",
    agentName: "系统内置",
    actions: ["like", "follow", "comment"],
    tags: ["主账号", "高活跃", "出海"],
    monthlyUses: 6,
    category: "nurture",
  },
  {
    id: uid("tpl"),
    name: "Tiktok 日常养号",
    subtype: "nurture",
    platforms: ["Tiktok"],
    total: 10,
    description: "对 Tiktok 账号执行轻量互动，每日点赞、关注与少量评论。",
    createdAt: "2026-05-12 09:00:00",
    uses: 7,
    status: "enabled",
    agentName: "系统内置",
    actions: ["like", "follow", "comment"],
    tags: ["主账号", "高活跃", "出海"],
    monthlyUses: 3,
    category: "nurture",
  },
  {
    id: uid("tpl"),
    name: "Twitter/X 日常养号",
    subtype: "nurture",
    platforms: ["Twitter/X"],
    total: 10,
    description: "对 Twitter/X 账号执行轻量互动，每日点赞、关注与少量评论。",
    createdAt: "2026-05-14 09:00:00",
    uses: 4,
    status: "enabled",
    agentName: "系统内置",
    actions: ["like", "follow", "comment"],
    tags: ["主账号", "高活跃", "出海"],
    monthlyUses: 2,
    category: "nurture",
  },
  {
    id: uid("tpl"),
    name: "Facebook 账号内容运营",
    subtype: "action",
    platforms: ["Facebook"],
    total: 10,
    description: "对Facebook账号执行日常内容运营和维护。",
    createdAt: "2026-06-15 09:00:00",
    uses: 6,
    status: "enabled",
    agentName: "系统内置",
    actions: ["sharePost", "hidePost", "deletePost", "editProfile"],
    tags: ["内容运营", "Facebook"],
    monthlyUses: 2,
    useDisabled: true,
    category: "account-ops",
  },
  {
    id: uid("tpl"),
    name: "Tiktok 账号内容运营",
    subtype: "action",
    platforms: ["Tiktok"],
    total: 10,
    description: "对Tiktok账号执行日常内容运营和维护。",
    createdAt: "2026-07-02 09:00:00",
    uses: 5,
    status: "enabled",
    agentName: "系统内置",
    actions: ["sharePost", "hidePost", "deletePost", "editProfile"],
    tags: ["内容运营", "Tiktok"],
    monthlyUses: 2,
    useDisabled: true,
    category: "account-ops",
  },
];


/* ============================================================ */
/* 全局共享 store                                               */
/* ============================================================ */

let _tasks: TaskRow[] = initialTasks;
let _templates: TaskTemplate[] = initialTemplates;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useTasks() {
  return useSyncExternalStore(subscribe, () => _tasks, () => _tasks);
}
export function useTemplates() {
  return useSyncExternalStore(subscribe, () => _templates, () => _templates);
}

type Updater<T> = T | ((prev: T) => T);
function applyTasks(u: Updater<TaskRow[]>) {
  _tasks = typeof u === "function" ? (u as (p: TaskRow[]) => TaskRow[])(_tasks) : u;
  emit();
}
function applyTemplates(u: Updater<TaskTemplate[]>) {
  _templates = typeof u === "function" ? (u as (p: TaskTemplate[]) => TaskTemplate[])(_templates) : u;
  emit();
}

export const tasksActions = {
  set: applyTasks,
  add: (t: TaskRow) =>
    applyTasks((prev) => {
      if (t.tenantId) return [t, ...prev];
      const scope = getTenantScope();
      const tenant =
        TASK_TENANTS.find((x) => x.id === scope) ?? TASK_TENANTS[0];
      return [
        tenant ? { ...t, tenantId: tenant.id, tenantName: tenant.name } : t,
        ...prev,
      ];
    }),
  remove: (id: string) => applyTasks((prev) => prev.filter((t) => t.id !== id)),
  update: (id: string, patch: Partial<TaskRow>) =>
    applyTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
  get: () => _tasks,
};

export const templatesActions = {
  set: applyTemplates,
  add: (t: TaskTemplate) => applyTemplates((prev) => [t, ...prev]),
  remove: (id: string) => applyTemplates((prev) => prev.filter((t) => t.id !== id)),
  update: (id: string, patch: Partial<TaskTemplate>) =>
    applyTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
  get: () => _templates,
};

/* ============================================================ */
/* 业务动作                                                     */
/* ============================================================ */

export function executeTask(taskId: string) {
  tasksActions.update(taskId, { status: "running", done: 0, failed: 0, aborted: false });
  const target = tasksActions.get().find((t) => t.id === taskId);
  const total = target?.total ?? 10;
  let step = 0;
  const tick = () => {
    const cur = tasksActions.get().find((t) => t.id === taskId);
    if (!cur || cur.aborted) return;
    step += 1;
    applyTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const fail = step >= Math.ceil(total * 0.6) && step % 4 === 0 ? t.failed + 1 : t.failed;
        const newDone = Math.min(total - fail, step);
        if (step >= total) {
          const finalFailed = fail;
          const finalDone = total - finalFailed;
          const status: TaskStatus = finalFailed === 0 ? "success" : finalDone === 0 ? "failed" : "partial";
          return { ...t, done: finalDone, failed: finalFailed, status, endTime: fmtNow() };
        }
        return { ...t, done: newDone, failed: fail };
      }),
    );
    if (step < total) setTimeout(tick, 350);
  };
  setTimeout(tick, 400);
}

export function abortTask(taskId: string) {
  tasksActions.update(taskId, { aborted: true, endTime: fmtNow() });
}



export function createTaskFromIntent(intent: ParsedIntent, raw: string): TaskRow {
  const name = `${SUBTYPE_LABEL[intent.subtype]}_${intent.platforms[0] ?? "多平台"}_${pad(new Date().getHours())}${pad(new Date().getMinutes())}`;
  const task: TaskRow = {
    id: genTaskId(),
    name,
    subtype: intent.subtype,
    platforms: intent.platforms,
    total: intent.total,
    done: 0,
    failed: 0,
    status: "pending",
    description: raw,
    createdBy: "黄雪",
    createdAt: fmtNow(),
  };
  tasksActions.add(task);
  return task;
}

export function createTaskFromTemplate(tpl: TaskTemplate): TaskRow {
  const task: TaskRow = {
    id: genTaskId(),
    name: `${tpl.name}_${pad(new Date().getHours())}${pad(new Date().getMinutes())}`,
    subtype: tpl.subtype,
    platforms: tpl.platforms,
    total: tpl.total,
    done: 0,
    failed: 0,
    status: "pending",
    description: tpl.description,
    createdBy: "黄雪",
    createdAt: fmtNow(),
    fromTemplate: tpl.name,
  };
  tasksActions.add(task);
  templatesActions.update(tpl.id, { uses: tpl.uses + 1, monthlyUses: (tpl.monthlyUses ?? 0) + 1 });
  return task;
}
