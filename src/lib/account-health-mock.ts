// 账号健康看板：状态映射、处置台账、趋势数据（前端 mock + 轻量 store）
import { useSyncExternalStore } from "react";
import {
  ACCOUNT_STATUS_META,
  seedManagedAccounts,
  type AccountStatus,
  type ManagedAccount,
  type Platform,
  OPERATORS,
} from "@/lib/managed-account-mock";

/** 平台账号状态文案：社媒平台侧展示的原始状态（附件表 1） */
export const PLATFORM_STATUS_MAP: Record<
  AccountStatus,
  Record<Platform, string>
> = {
  pending: {
    Facebook: "——",
    Tiktok: "——",
    "Twitter/X": "——",
    WhatsApp: "——",
    Instagram: "——",
  },
  normal: {
    Facebook: "正常 (Active)",
    Tiktok: "正常 (Active)",
    "Twitter/X": "正常 (Active)",
    WhatsApp: "正常 (Active)",
    Instagram: "正常 (Active)",
  },
  disabled: {
    Facebook: "功能受限 (Restricted)",
    Tiktok: "功能受限 (Feature Restriction)",
    "Twitter/X": "锁定 (Locked) / 只读受限 (Limited / Read-only)",
    WhatsApp: "受限 (Restricted)",
    Instagram: "功能受限 (Feature Restriction)",
  },
  risk: {
    Facebook: "安全锁定 (Locked/Checkpoint) / 暂停 (Suspended)",
    Tiktok: "临时暂停 (Temporary Suspension)",
    "Twitter/X": "临时暂停 (Temporary Suspension)",
    WhatsApp: "临时封禁 (Temporarily Banned)",
    Instagram: "暂停 (Suspended)",
  },
  loginFail: {
    Facebook: "无法登录 (Login Failed)",
    Tiktok: "登录失败 (Login Failed)",
    "Twitter/X": "登录失败 (Login Failed)",
    WhatsApp: "无法登录 (Login Failed)",
    Instagram: "登录失败 (Login Failed)",
  },
  fail: {
    Facebook: "已禁用 (Disabled) / 已封禁 (Banned)",
    Tiktok: "永久封禁 (Permanent Ban)",
    "Twitter/X": "永久暂停 (Permanent Suspension)",
    WhatsApp: "永久封禁 (Banned)",
    Instagram: "禁用 (Disabled) / 删除 (Deleted)",
  },
};

/** 状态整体说明（附件表 1 最后一列） */
export const STATUS_EXPLAIN: Record<AccountStatus, string> = {
  pending: "首次导入运营系统，需要运营人工确认账号状态并标记为与平台一致的状态",
  normal: "可登录，功能操作不受限",
  disabled: "可登录，功能受限，可申诉或验证或等待期满【需要人工介入：处理并标记说明】",
  risk: "不可登录，可申诉或验证或等待期满【需要人工介入：处理并标记说明】",
  loginFail: "无法登录，多为凭据失效、二次验证或设备/IP 异常【需要人工介入：处理并标记说明】",
  fail: "永久封号，不可申诉",
};

/** 受限/风控的典型说明（附件表 2 的“不可操作”归纳） */
const NOTE_POOL: Record<Platform, { disabled: string[]; risk: string[] }> = {
  Facebook: {
    disabled: [
      "功能受限-不可发帖",
      "功能受限-不可评论",
      "功能受限-不可创建 Page / 投放广告",
    ],
    risk: ["安全锁定-需完成身份验证后解锁", "暂停-违反社区准则，全部功能不可用"],
  },
  Tiktok: {
    disabled: ["功能受限-不可发帖", "功能受限-不可私信", "功能受限-不可评论"],
    risk: ["临时暂停-违规累计/内容审查中"],
  },
  "Twitter/X": {
    disabled: ["只读受限-不可发帖/转推/点赞", "锁定-需完成验证后发帖"],
    risk: ["临时暂停-首次违规，通常 24 小时~7 天"],
  },
  WhatsApp: {
    disabled: ["受限-不可给新联系人发起聊天/建群"],
    risk: ["临时封禁-检测到第三方 App / 批量抓取"],
  },
  Instagram: {
    disabled: ["功能受限-部分功能不可用（内容被移除）"],
    risk: ["暂停-违反社区准则或服务条款"],
  },
};

/** 登录失败的典型原因说明 */
const LOGIN_FAIL_NOTES = [
  "登录失败-Cookie 凭据已失效，需重新登录",
  "登录失败-触发二次验证（短信/邮箱验证码）",
  "登录失败-设备/IP 异常，被平台拒绝登录",
];

/** 附件表 2：申诉 / 恢复方式 */
export const HANDLE_METHODS = [
  "确认账号状态",
  "等待期满",
  "发起申诉",
  "身份验证",
  "换设备/IP 重登",
  "更换官方 App",
  "停用账号",
  "其他",
] as const;
export type HandleMethod = (typeof HANDLE_METHODS)[number];

export const HANDLE_RESULTS = [
  "状态已核实",
  "已恢复",
  "仍受限",
  "永久封禁",
  "待观察",
] as const;
export type HandleResult = (typeof HANDLE_RESULTS)[number];

/** 需要人工确认 / 处理的账号状态 */
export const MANUAL_STATUSES: AccountStatus[] = [
  "pending",
  "disabled",
  "risk",
  "loginFail",
];
export function isManualStatus(s: AccountStatus) {
  return MANUAL_STATUSES.includes(s);
}

/** 平台 + 状态 → 推荐恢复方式提示（附件表 2） */
export function recommendMethods(
  platform: Platform,
  status: AccountStatus,
): HandleMethod[] {
  if (status === "pending") return ["确认账号状态"];
  if (status === "disabled") {
    if (platform === "WhatsApp") return ["等待期满", "更换官方 App"];
    if (platform === "Twitter/X") return ["身份验证", "等待期满"];
    return ["等待期满", "发起申诉"];
  }
  if (status === "risk") {
    if (platform === "Facebook") return ["身份验证", "发起申诉", "换设备/IP 重登"];
    if (platform === "WhatsApp") return ["等待期满", "更换官方 App"];
    return ["等待期满", "发起申诉"];
  }
  if (status === "loginFail") return ["换设备/IP 重登", "身份验证"];
  if (status === "fail") return ["停用账号"];
  return ["其他"];
}

export type MarkSource = "system" | "manual";
export type HandleState = "todo" | "doing" | "done";

export const MARK_SOURCE_LABEL: Record<MarkSource, string> = {
  system: "系统标记",
  manual: "人工确认",
};
export const HANDLE_STATE_LABEL: Record<HandleState, string> = {
  todo: "待确认/处理",
  doing: "处理中",
  done: "已处理",
};
export const HANDLE_STATE_CLS: Record<HandleState, string> = {
  todo: "bg-destructive/10 text-destructive border-destructive/30",
  doing: "bg-warning/10 text-warning border-warning/30",
  done: "bg-success/10 text-success border-success/30",
};

export interface HealthTimelineItem {
  at: string;
  text: string;
  by: string;
}

/**
 * 待处理事项（issue）：同一账号状态下可能同时存在多个受限项，
 * 例如「功能受限」可同时包含私信受限、评论受限，需要分别处置与追踪。
 */
export interface HealthIssue {
  id: string;
  /** 受影响能力，如 发帖 / 评论 / 私信 / 登录 */
  scope: string;
  desc: string;
  state: HandleState;
  method?: HandleMethod;
  result?: HandleResult;
  note?: string;
  handler?: string;
  raisedAt: string;
  handledAt?: string;
}

/** 各状态下的典型待处理事项池（同一状态可命中多条） */
const ISSUE_POOL: Record<AccountStatus, { scope: string; desc: string }[]> = {
  pending: [{ scope: "账号状态", desc: "首次导入，需核实平台真实状态" }],
  normal: [],
  disabled: [
    { scope: "发帖", desc: "不可发布新帖（历史内容被判定违规）" },
    { scope: "评论", desc: "评论受限，提交后对他人不可见" },
    { scope: "私信", desc: "不可向新联系人发起私信" },
    { scope: "加好友", desc: "好友 / 关注请求被限流" },
    { scope: "广告", desc: "不可创建 Page 或投放广告" },
  ],
  risk: [
    { scope: "登录", desc: "安全检查点，需完成身份验证后解锁" },
    { scope: "全功能", desc: "账号暂停，全部互动能力不可用" },
  ],
  loginFail: [
    { scope: "登录凭据", desc: "Cookie 凭据已失效，需重新登录" },
    { scope: "二次验证", desc: "触发短信 / 邮箱验证码校验" },
    { scope: "设备/IP", desc: "设备或 IP 异常，被平台拒绝登录" },
  ],
  fail: [{ scope: "账号", desc: "永久封禁，不可申诉" }],
};

/** 由事项状态汇总账号级处理状态 */
export function rollupHandleState(issues: HealthIssue[]): HandleState {
  if (issues.length === 0) return "done";
  if (issues.every((i) => i.state === "done")) return "done";
  if (issues.some((i) => i.state === "doing")) return "doing";
  return "todo";
}

export interface AccountHealthRecord {
  accountId: string;
  platform: Platform;
  username: string;
  platformId: string;
  avatar: string;
  tenantId: string;
  tenantName: string;
  status: AccountStatus;
  platformStatus: string;
  markSource: MarkSource;
  statusNote: string;
  needsManual: boolean;
  handleState: HandleState;
  handleMethod?: HandleMethod;
  handleResult?: HandleResult;
  handleNote?: string;
  handler?: string;
  markedAt: string;
  handledAt?: string;
  /** 该账号当前状态下的多个待处理事项 */
  issues: HealthIssue[];
  timeline: HealthTimelineItem[];
}


function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dayStr(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowStr() {
  const d = new Date();
  return `${dayStr(0)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildRecord(a: ManagedAccount, i: number): AccountHealthRecord {
  const needsManual = isManualStatus(a.accountStatus);
  const pool = NOTE_POOL[a.platform];
  const markSource: MarkSource =
    a.accountStatus === "pending" ? "system" : i % 3 === 0 ? "manual" : "system";
  const markedAt = `${dayStr((i % 12) + 1)} ${pad(9 + (i % 9))}:${pad((i * 7) % 60)}`;
  const handler = OPERATORS[i % OPERATORS.length];
  const methods = recommendMethods(a.platform, a.accountStatus);

  // —— 生成多个待处理事项：功能受限最多 3 条，风控/登录失败 1~2 条 ——
  const issuePool = ISSUE_POOL[a.accountStatus];
  const issueCount = !needsManual
    ? 0
    : a.accountStatus === "pending"
      ? 1
      : a.accountStatus === "disabled"
        ? (i % 3) + 1
        : (i % 2) + 1;
  const issues: HealthIssue[] = Array.from({ length: issueCount }, (_, j) => {
    const src = issuePool[(i + j * 2) % Math.max(1, issuePool.length)];
    const st: HandleState =
      a.accountStatus === "pending"
        ? "todo"
        : ((i + j) % 3 === 0 ? "done" : (i + j) % 3 === 1 ? "doing" : "todo");
    const raisedAt = `${dayStr((i % 12) + 1)} ${pad(9 + ((i + j) % 9))}:${pad((i * 7 + j * 11) % 60)}`;
    const method = methods[(i + j) % methods.length];
    const who = OPERATORS[(i + j) % OPERATORS.length];
    const issue: HealthIssue = {
      id: `${a.id}-is-${j + 1}`,
      scope: src?.scope ?? "账号状态",
      desc: src?.desc ?? "需人工核实",
      state: st,
      raisedAt,
    };
    if (st !== "todo") {
      issue.method = method;
      issue.handler = who;
      issue.handledAt = `${dayStr(i % 6)} ${pad(10 + ((i + j) % 8))}:${pad((i * 13 + j * 7) % 60)}`;
      issue.result = st === "done" ? ((i + j) % 4 === 0 ? "仍受限" : "已恢复") : "待观察";
      issue.note =
        st === "done"
          ? `${src?.scope ?? "该项"}已按「${method}」处置完成，平台侧已恢复校验`
          : `已提交「${method}」，等待平台响应（预计 24~72 小时）`;
    }
    return issue;
  });

  const statusNote = needsManual
    ? issues.length > 0
      ? issues.map((it) => `${it.scope}：${it.desc}`).join("；")
      : "需人工核实"
    : a.accountStatus === "fail"
      ? "永久封号，不可申诉"
      : "可登录，功能操作不受限";
  // 保留平台维度的原始说明，供导出/详情引用
  const platformNote =
    a.accountStatus === "disabled"
      ? pool.disabled[i % pool.disabled.length]
      : a.accountStatus === "risk"
        ? pool.risk[i % pool.risk.length]
        : a.accountStatus === "loginFail"
          ? LOGIN_FAIL_NOTES[i % LOGIN_FAIL_NOTES.length]
          : statusNote;

  const handleState: HandleState = needsManual ? rollupHandleState(issues) : "done";

  const timeline: HealthTimelineItem[] = [
    {
      at: markedAt,
      text: `${markSource === "system" ? "系统监测" : "人工确认"}标记为「${ACCOUNT_STATUS_META[a.accountStatus].label}」：${platformNote}`,
      by: markSource === "system" ? "系统" : handler,
    },
  ];
  if (needsManual && issues.length > 1) {
    timeline.push({
      at: markedAt,
      text: `识别到 ${issues.length} 项待处理事项：${issues.map((it) => it.scope).join("、")}`,
      by: "系统",
    });
  }
  issues
    .filter((it) => it.state !== "todo")
    .sort((x, y) => (x.handledAt! < y.handledAt! ? -1 : 1))
    .forEach((it) => {
      timeline.push({
        at: it.handledAt!,
        text: `【${it.scope}】${HANDLE_STATE_LABEL[it.state]} · ${it.method} · 结果：${it.result}${it.note ? ` · ${it.note}` : ""}`,
        by: it.handler!,
      });
    });
  if (needsManual && handleState === "done" && issues.length > 0) {
    const last = issues[issues.length - 1];
    timeline.push({
      at: last.handledAt ?? markedAt,
      text: `全部 ${issues.length} 项事项已闭环，复核账号状态正常可用`,
      by: handler,
    });
  }

  const rec: AccountHealthRecord = {
    accountId: a.id,
    platform: a.platform,
    username: a.username,
    platformId: a.platformId,
    avatar: a.avatar,
    tenantId: a.tenantId,
    tenantName: a.tenantName,
    status: a.accountStatus,
    platformStatus: PLATFORM_STATUS_MAP[a.accountStatus][a.platform],
    markSource,
    statusNote,
    needsManual,
    handleState,
    markedAt,
    issues,
    timeline,
  };

  const handled = issues.filter((it) => it.state !== "todo");
  const latest = handled[handled.length - 1];
  if (latest) {
    rec.handleMethod = latest.method;
    rec.handleResult = latest.result;
    rec.handleNote = latest.note;
    rec.handler = latest.handler;
    rec.handledAt = latest.handledAt;
  }
  return rec;
}


let state: AccountHealthRecord[] = seedManagedAccounts().map(buildRecord);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const healthActions = {
  /** 人工确认状态 */
  confirmStatus(
    id: string,
    input: { status: AccountStatus; platformStatus: string; note: string; by: string },
  ) {
    state = state.map((r) =>
      r.accountId !== id
        ? r
        : {
            ...r,
            status: input.status,
            platformStatus: input.platformStatus,
            statusNote: input.note,
            markSource: "manual",
            needsManual: isManualStatus(input.status),
            handleState: isManualStatus(input.status) ? "todo" : "done",
            markedAt: nowStr(),
            timeline: [
              ...r.timeline,
              {
                at: nowStr(),
                text: `人工确认状态为「${input.platformStatus}」：${input.note}`,
                by: input.by,
              },
            ],
          },
    );
    emit();
  },
  /**
   * 登记人工处理
   * - 传 issueIds 时：只处置选中的事项，账号级状态由各事项汇总（rollup）
   * - 不传时：视为处置该账号当前全部未闭环事项
   */
  registerHandling(
    ids: string[],
    input: {
      handleState: HandleState;
      method: HandleMethod;
      result: HandleResult;
      note: string;
      by: string;
      issueIds?: string[];
    },
  ) {
    const set = new Set(ids);
    const at = nowStr();
    state = state.map((r) => {
      if (!set.has(r.accountId)) return r;
      const pick = input.issueIds
        ? new Set(input.issueIds)
        : new Set(r.issues.filter((it) => it.state !== "done").map((it) => it.id));
      const issues = r.issues.map((it) =>
        !pick.has(it.id)
          ? it
          : {
              ...it,
              state: input.handleState,
              method: input.method,
              result: input.result,
              note: input.note,
              handler: input.by,
              handledAt: at,
            },
      );
      const touched = r.issues.filter((it) => pick.has(it.id));
      const scopeText =
        touched.length > 0 ? `【${touched.map((it) => it.scope).join("、")}】` : "";
      const rolled = issues.length > 0 ? rollupHandleState(issues) : input.handleState;
      return {
        ...r,
        issues,
        handleState: rolled,
        handleMethod: input.method,
        handleResult: input.result,
        handleNote: input.note,
        handler: input.by,
        handledAt: at,
        timeline: [
          ...r.timeline,
          {
            at,
            text: `${scopeText}${HANDLE_STATE_LABEL[input.handleState]} · ${input.method} · 结果：${input.result}${input.note ? ` · ${input.note}` : ""}`,
            by: input.by,
          },
        ],
      };
    });
    emit();

  },
};

export function useAccountHealth(): AccountHealthRecord[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/* ---------------- 趋势数据 ---------------- */

export const STATUS_ORDER: AccountStatus[] = [
  "pending",
  "normal",
  "disabled",
  "risk",
  "loginFail",
  "fail",
];

export const STATUS_COLOR: Record<AccountStatus, string> = {
  pending: "var(--warning)",
  normal: "var(--success)",
  disabled: "#E6A23C",
  risk: "#9B5CFF",
  loginFail: "#F97316",
  fail: "var(--destructive)",
};

export type TrendRange = "7d" | "14d" | "30d" | "custom";

export const RANGE_LABEL: Record<TrendRange, string> = {
  "7d": "近 7 天",
  "14d": "近两周",
  "30d": "近一个月",
  custom: "自定义",
};

function seededNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export type TrendPoint = { date: string } & Record<string, number | string>;

function counts(records: AccountHealthRecord[]) {
  const c: Record<AccountStatus, number> = {
    pending: 0,
    normal: 0,
    disabled: 0,
    risk: 0,
    loginFail: 0,
    fail: 0,
  };
  records.forEach((r) => (c[r.status] += 1));
  return c;
}

/** 生成 days 天的趋势序列，末日与当前真实统计对齐 */
export function buildTrend(
  records: AccountHealthRecord[],
  days: number,
  seedKey = 0,
): TrendPoint[] {
  const target = counts(records);
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const p: TrendPoint = { date: dayStr(i).slice(5) };
    STATUS_ORDER.forEach((s, si) => {
      if (i === 0) {
        p[s] = target[s];
        return;
      }
      const base = target[s];
      const drift = Math.round(
        (seededNoise(i * 7 + si * 31 + seedKey * 97) - 0.45) * Math.max(2, base * 0.35),
      );
      p[s] = Math.max(0, base + drift);
    });
    out.push(p);
  }
  return out;
}

export function daysOfRange(range: TrendRange, from?: string, to?: string): number {
  if (range === "7d") return 7;
  if (range === "14d") return 14;
  if (range === "30d") return 30;
  if (from && to) {
    const d = Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
    );
    return Math.min(90, Math.max(1, d + 1));
  }
  return 7;
}
