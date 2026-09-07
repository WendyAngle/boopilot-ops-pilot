// AI 预设物料 — 平台级预置素材库
// 与「我的原料」(materials-store) 的区别：
//   - 我的原料：租户/用户上传，仅本租户可见，由业务运营维护
//   - AI 预设物料：平台预置，全租户或按套餐档位可见(只读引用)，由系统管理员维护
//
// 设计要点：
//   - category 决定卡片渲染方式与表单字段差异
//   - visibility 控制哪些租户可在 AI 创作端看到
//   - preset 类型(字幕/转场/滤镜)不是真实文件，仅元数据
import { useSyncExternalStore } from "react";
import type { PlanTier } from "@/lib/billing-plans";
import avatarRealistic0 from "@/assets/avatars/realistic-0.png";
import avatarRealistic1 from "@/assets/avatars/realistic-1.png";
import avatarRealistic2 from "@/assets/avatars/realistic-2.png";

export type PresetCategory =
  | "bgm"
  | "voiceover"
  | "avatar"
  | "subtitle-style";

export const PRESET_CATEGORY_META: Record<
  PresetCategory,
  { label: string; desc: string; assetKind: "audio" | "video" | "image" | "preset" }
> = {
  bgm: { label: "背景音乐", desc: "情绪化的氛围与节奏配乐", assetKind: "audio" },
  voiceover: { label: "配音音色", desc: "多语种、多风格的合成音色", assetKind: "audio" },
  avatar: { label: "数字人模特", desc: "可口型驱动的数字人形象", assetKind: "video" },
  "subtitle-style": { label: "字幕样式", desc: "字体、描边、动效预设", assetKind: "preset" },
};

export const PRESET_CATEGORIES: PresetCategory[] = [
  "bgm",
  "voiceover",
  "avatar",
  "subtitle-style",
];

export type PresetStatus = "active" | "inactive";

/** 可见范围：全部租户 / 指定套餐档位及以上 */
export type PresetVisibility =
  | { kind: "all" }
  | { kind: "plan"; minPlan: PlanTier };

export type SubtitleStyleKey =
  | "shadow-3d"
  | "block-emphasis"
  | "outline-box"
  | "classic-black"
  | "classic-white"
  | "dark"
  | "fresh"
  | "italic"
  | "lemon"
  | "neon"
  | "outline-glow"
  | "translucent"
  | "shadow-block"
  | "spotlight-block"
  | "white-bar"
  | "white-outline";

export interface PresetItem {
  id: string;
  name: string;
  category: PresetCategory;
  cover?: string;
  /** 资源 URL：音/视频文件、图片；preset 类型可空 */
  url?: string;
  duration?: string;
  size?: string;
  tags: string[];
  description: string;
  /** 分类专属属性：BPM / 情绪 / 语言 / 性别 / 风格 / 字体 等 */
  attrs: Record<string, string>;
  /** 字幕样式预览 key（仅 subtitle-style 分类使用） */
  previewStyle?: SubtitleStyleKey;
  status: PresetStatus;
  visibility: PresetVisibility;
  createdBy: string;
  updatedAt: string;
}

const IMG = (s: string) => `https://picsum.photos/seed/${s}/640/480`;
const AUDIO = "https://www.w3schools.com/html/horse.mp3";
const VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const INITIAL: PresetItem[] = [
  // 背景音乐（按曲风/情绪命名，参考创作端选择器）
  ...([
    ["流行轻快", "Pop", "轻快", "102", "01:48", "轻盈愉悦的流行节奏，适合种草、Vlog。", ["流行", "轻快"], "all"],
    ["电子节奏", "EDM", "动感", "128", "01:58", "动感电子律动，适合快节奏短视频。", ["电子", "动感"], "all"],
    ["舒缓钢琴", "Piano", "舒缓", "72", "02:20", "纯净钢琴旋律，适合情感、品牌故事。", ["钢琴", "舒缓"], "all"],
    ["国风古韵", "National", "古韵", "84", "02:05", "古筝琵琶交织的国风配乐，适合国潮、文化。", ["国风", "古韵"], "plan-basic"],
    ["燃情史诗", "Cinematic", "震撼", "78", "02:14", "宏大磅礴的电影感 BGM，适合品牌片头。", ["史诗", "电影感"], "plan-basic"],
    ["都市 Lofi", "Lofi", "放松", "92", "01:32", "节奏轻快的都市 Lofi，适合咖啡店、生活类。", ["Lofi", "都市"], "all"],
    ["温柔民谣", "Folk", "治愈", "88", "02:00", "温柔吉他民谣，适合治愈、亲情主题。", ["民谣", "治愈"], "all"],
    ["热血摇滚", "Rock", "燃", "138", "01:46", "热血摇滚律动，适合运动、潮流。", ["摇滚", "热血"], "plan-basic"],
  ] as const).map(([name, genre, mood, bpm, dur, desc, tags, vis], i) => ({
    id: `p-bgm-${String(i + 1).padStart(2, "0")}`,
    name,
    category: "bgm" as PresetCategory,
    url: AUDIO,
    duration: dur,
    size: "3.2 MB",
    tags: [...tags],
    description: desc,
    attrs: { 曲风: genre, 情绪: mood, BPM: bpm, 时长: dur },
    status: "active" as PresetStatus,
    visibility:
      vis === "all"
        ? ({ kind: "all" } as PresetVisibility)
        : ({ kind: "plan", minPlan: "basic" } as PresetVisibility),
    createdBy: "系统",
    updatedAt: "2026-06-08 10:24",
  })),

  // 配音音色（按「性别-风格」范式命名，参考创作端选择器）
  ...([
    ["女声-知性", "女", "知性", "中文(普通话)", "青年", "知性清亮，适合科普、品牌讲述。", ["女声", "知性"], "all"],
    ["女声-甜美", "女", "甜美", "中文(普通话)", "青年", "甜美亲和，适合美妆、母婴。", ["女声", "甜美"], "all"],
    ["女声-温柔", "女", "温柔", "中文(普通话)", "青年", "温柔细腻，适合生活、情感类。", ["女声", "温柔"], "all"],
    ["男声-沉稳", "男", "沉稳", "中文(普通话)", "中年", "沉稳磁性，适合科技、商务。", ["男声", "沉稳"], "all"],
    ["男声-阳光", "男", "阳光", "中文(普通话)", "青年", "阳光活力，适合运动、户外。", ["男声", "阳光"], "all"],
    ["男声-浑厚", "男", "浑厚", "中文(普通话)", "中年", "低沉浑厚，适合纪录片、史诗解说。", ["男声", "浑厚"], "plan-basic"],
    ["童声-活泼", "童", "活泼", "中文(普通话)", "儿童", "活泼俏皮的童声，适合亲子、玩具。", ["童声", "活泼"], "all"],
    ["女声-知性(English)", "女", "Pro", "English (US)", "青年", "清晰自然的英文女声，适合海外投放。", ["English", "Female"], "plan-basic"],
  ] as const).map(([name, gender, style, lang, age, desc, tags, vis], i) => ({
    id: `p-vo-${String(i + 1).padStart(2, "0")}`,
    name,
    category: "voiceover" as PresetCategory,
    cover: IMG(`preset-vo-${i + 1}`),
    url: AUDIO,
    duration: "00:08",
    tags: [...tags],
    description: desc,
    attrs: { 性别: gender, 风格: style, 语言: lang, 年龄: age, 采样率: "24kHz" },
    status: "active" as PresetStatus,
    visibility:
      vis === "all"
        ? ({ kind: "all" } as PresetVisibility)
        : ({ kind: "plan", minPlan: "basic" } as PresetVisibility),
    createdBy: "系统",
    updatedAt: "2026-06-05 17:20",
  })),

  // 数字人模特（写实 3D + Q 版 IP 形象，封面 1:1 匹配参考图）
  ...([
    [
      "薇薇 · 元气少女",
      "写实3D",
      "少女",
      "甜美日常",
      "写实 3D 少女数字人，灰白短款上衣 + 淡紫格纹百褶裙 + 黑色玛丽珍鞋，邻家甜美风，适合美妆、母婴、潮流、校园题材口播。",
      ["写实", "少女", "甜美", "全身"],
      "1080×1920",
      "plan-basic",
      avatarRealistic0,
      "p-av-weiwei",
    ],
    [
      "墨白 · 阳光男青年",
      "写实3D",
      "男青年",
      "都市休闲",
      "写实 3D 男青年数字人，橘红针织毛衣 + 深棕工装裤 + 黑色厚底靴，都市休闲风，适合运动户外、男士护理、生活方式品类口播。",
      ["写实", "男青年", "都市", "全身"],
      "1080×1920",
      "plan-pro",
      avatarRealistic1,
      "p-av-mobai",
    ],
    [
      "雅琴 · 知性女主播",
      "写实3D",
      "成熟女性",
      "知性优雅",
      "写实 3D 成熟女性数字人，橄榄绿针织长裙 + 系带腰封 + 黑色高跟鞋，知性优雅风，适合财经、教育、企业宣传、高端品牌口播。",
      ["写实", "知性", "优雅", "全身"],
      "1920×1080",
      "plan-pro",
      avatarRealistic2,
      "p-av-yaqin",
    ],
    [
      "天巡 · 科技少年 IP",
      "Q版IP",
      "男孩",
      "科技未来",
      "Q 版 3D 少年宇航员形象，橙白宇航服 + 智能护目镜 + 全息平板，适合科技、教育、航天、儿童科普类内容。",
      ["Q版", "宇航员", "科技", "少年"],
      "1080×1920",
      "plan-flagship",
      "https://io.eklas.dev/media/2bf85cb9786c/2026/06/12/1781254983983_4wua7ijke7fe_image.png",
      "p-av-tianxun",
    ],
    [
      "小柠 · 元气女孩 IP",
      "Q版IP",
      "女孩",
      "元气甜美",
      "Q 版 3D 元气女孩形象，柠檬黄外套 + 百褶裙 + 发箍，暖色调甜美风，适合母婴、零食、潮玩、节日活动。",
      ["Q版", "元气", "甜美", "黄色系"],
      "1080×1920",
      "plan-basic",
      "https://io.eklas.dev/media/2bf85cb9786c/2026/06/12/1781254985748_xne15oo1bq74_image.png",
      "p-av-xiaoning",
    ],
    [
      "苹苹 · 红苹娃娃吉祥物",
      "吉祥物",
      "IP 玩偶",
      "国潮喜庆",
      "红色苹果造型 IP 吉祥物，大眼睛 + 苹果叶 + ABC 飘带，红白配色喜庆活泼，适合国潮、生鲜、节庆、品牌代言。",
      ["吉祥物", "苹果", "国潮", "喜庆"],
      "1080×1920",
      "plan-flagship",
      "https://io.eklas.dev/media/2bf85cb9786c/2026/06/12/1781254987095_kobeablsevzl_image.png",
      "p-av-pingping",
    ],
  ] as const).map(([name, type, role, style, desc, tags, res, vis, cover], i) => ({
    id: `p-av-${String(i + 1).padStart(2, "0")}`,
    name,
    category: "avatar" as PresetCategory,
    cover,
    url: VIDEO,
    tags: [...tags],
    description: desc,
    attrs: { 类型: type, 形象: role, 风格: style, 口型驱动: "支持", 分辨率: res },
    status: "active" as PresetStatus,
    visibility:
      vis === "plan-flagship"
        ? ({ kind: "plan", minPlan: "flagship" } as PresetVisibility)
        : vis === "plan-pro"
          ? ({ kind: "plan", minPlan: "pro" } as PresetVisibility)
          : ({ kind: "plan", minPlan: "basic" } as PresetVisibility),
    createdBy: "系统",
    updatedAt: "2026-06-09 10:05",
  })),



  // 字幕样式（16 种）
  ...([
    ["shadow-3d", "3D 阴影", "立体偏移阴影，强调层次。", ["立体", "阴影"], "all"],
    ["block-emphasis", "区块强调", "红色色块衬底，醒目突出。", ["强调", "色块"], "all"],
    ["outline-box", "边框", "细线边框 + 白底，干净克制。", ["边框", "极简"], "all"],
    ["classic-black", "经典黑条", "黑底白字，影院字幕风。", ["经典", "影院"], "all"],
    ["classic-white", "经典白条", "白底黑字，明亮清晰。", ["经典"], "all"],
    ["dark", "黑暗", "纯黑底无衬底，深色场景。", ["暗色"], "all"],
    ["fresh", "清新", "蓝绿渐变 + 蓝字，柔和清新。", ["清新", "渐变"], "all"],
    ["italic", "倾斜", "倾斜黑底白字，运动感强。", ["运动", "倾斜"], "plan-basic"],
    ["lemon", "柠檬", "黄底黑描边，明亮活泼。", ["活泼", "黄色"], "all"],
    ["neon", "霓虹", "紫色辉光霓虹字，夜场氛围。", ["霓虹", "辉光"], "plan-basic"],
    ["outline-glow", "轮廓高亮", "黄描边 + 紫粉底，潮酷强调。", ["潮酷", "高亮"], "plan-basic"],
    ["translucent", "半透明", "半透明衬底，温和不抢戏。", ["半透明"], "all"],
    ["shadow-block", "阴影区块强调", "橙色块 + 投影，电商促销。", ["促销", "电商"], "all"],
    ["spotlight-block", "聚光灯区块强调", "黄块 + 黄色聚光辉光。", ["聚光", "舞台"], "plan-basic"],
    ["white-bar", "白条式高亮", "白色下划高亮条，重点词。", ["高亮", "重点"], "all"],
    ["white-outline", "白色轮廓", "无衬底白描边字，灵动通透。", ["轮廓", "通透"], "plan-pro"],
  ] as const).map(([key, name, desc, tags, vis], i) => ({
    id: `p-sub-${String(i + 1).padStart(2, "0")}`,
    name,
    category: "subtitle-style" as PresetCategory,
    tags: [...tags],
    description: desc,
    attrs: { 效果: name, 字体: "PingFang SC", 字号: "48", 适配: "通用" },
    previewStyle: key as SubtitleStyleKey,
    status: "active" as PresetStatus,
    visibility:
      vis === "all"
        ? ({ kind: "all" } as PresetVisibility)
        : ({
            kind: "plan",
            minPlan: vis === "plan-pro" ? "pro" : "basic",
          } as PresetVisibility),
    createdBy: "系统",
    updatedAt: "2026-05-28 09:00",
  })),

];


// ---- store ----
let _items: PresetItem[] = [...INITIAL];
const _listeners = new Set<() => void>();
const emit = () => _listeners.forEach((f) => f());
const subscribe = (f: () => void) => {
  _listeners.add(f);
  return () => _listeners.delete(f);
};
const snapshot = () => _items;

export function getPresets() {
  return _items;
}
export function addPreset(p: PresetItem) {
  _items = [p, ..._items];
  emit();
}
export function updatePreset(id: string, patch: Partial<PresetItem>) {
  _items = _items.map((p) => (p.id === id ? { ...p, ...patch } : p));
  emit();
}
export function deletePresets(ids: string[]) {
  const set = new Set(ids);
  _items = _items.filter((p) => !set.has(p.id));
  emit();
}
export function togglePresetStatus(id: string) {
  _items = _items.map((p) =>
    p.id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p,
  );
  emit();
}
export function usePresetsStore(): PresetItem[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function genPresetId(category: PresetCategory) {
  const short = category.slice(0, 3);
  const ts = Date.now().toString(36).slice(-4);
  const rand = Math.random().toString(36).slice(2, 5);
  return `p-${short}-${ts}${rand}`.toLowerCase();
}
