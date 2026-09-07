// 我的原料 — 唯一真理源
// 集中管理 Asset 类型、purpose（用途）枚举、usedBy（被引用情况），以及一个
// 简易的模块级订阅 store，供 AI 创作页面通过 MaterialPicker 直接复用。
//
// 设计要点：
// - `type` 是资产文件类型（图片/视频/音频）。
// - `purpose` 是“使用用途”，与 type 正交、多选。例：audio 可同时是 bgm/voiceover/sfx。
// - `usedBy` 记录被哪些创作记录引用，用于删除二次确认与“被引用”徽标。

import { useEffect, useSyncExternalStore } from "react";

export type AssetType = "image" | "video" | "audio";

export type AudioPurpose = "bgm" | "voiceover" | "sfx";
export type ImagePurpose = "logo" | "product" | "scene" | "ugc" | "reference";
export type VideoPurpose = "b-roll" | "product-shot" | "clip" | "template";
export type Purpose = AudioPurpose | ImagePurpose | VideoPurpose;

export const PURPOSE_LABEL: Record<Purpose, string> = {
  bgm: "背景音乐",
  voiceover: "配音音色",
  sfx: "音效",
  logo: "Logo",
  product: "产品图",
  scene: "场景图",
  ugc: "UGC",
  reference: "参考图",
  "b-roll": "空镜",
  "product-shot": "产品镜头",
  clip: "片段",
  template: "模板",
};

export const PURPOSE_BY_TYPE: Record<AssetType, Purpose[]> = {
  audio: ["bgm", "voiceover", "sfx"],
  image: ["logo", "product", "scene", "ugc", "reference"],
  video: ["b-roll", "product-shot", "clip", "template"],
};

export interface UsedByEntry {
  module: "video" | "image" | "remix" | "erase" | "replicate";
  refId: string;
  refTitle: string;
  usedAt: string;
}

export const MODULE_LABEL: Record<UsedByEntry["module"], string> = {
  video: "视频生成",
  image: "图片生成",
  remix: "图片混剪",
  erase: "智能擦除",
  replicate: "一键复刻",
};

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  purpose: Purpose[];
  url: string;
  thumb?: string;
  size: string;
  duration?: string;
  tags: string[];
  description: string;
  uploadedAt: string;
  hash: string;
  usedBy: UsedByEntry[];
}

const SAMPLE_IMG = (seed: string) => `https://picsum.photos/seed/${seed}/640/480`;
const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const SAMPLE_AUDIO = "https://www.w3schools.com/html/horse.mp3";

// 根据文件名/标签关键字推断默认用途
export function inferPurpose(type: AssetType, name: string, tags: string[] = []): Purpose[] {
  const hay = (name + " " + tags.join(" ")).toLowerCase();
  if (type === "audio") {
    if (/(bgm|背景|music|配乐|乐|节奏|律动|cinematic|lofi|edm|国乐|钢琴|史诗)/.test(hay))
      return ["bgm"];
    if (/(voice|配音|旁白|解说|女声|男声|童声|播音)/.test(hay)) return ["voiceover"];
    if (/(sfx|音效|whoosh|pop|按键|提示音)/.test(hay)) return ["sfx"];
    return ["bgm"];
  }
  if (type === "image") {
    if (/logo/.test(hay)) return ["logo"];
    if (/(产品|product|开箱|商品)/.test(hay)) return ["product"];
    if (/(场景|scene|厨房|海边|街景|户外)/.test(hay)) return ["scene"];
    if (/(ugc|好评|用户|截图)/.test(hay)) return ["ugc"];
    return ["reference"];
  }
  // video
  if (/(模板|template)/.test(hay)) return ["template"];
  if (/(产品|开箱|product)/.test(hay)) return ["product-shot"];
  if (/(空镜|城市|夜景|风景|延时|b-?roll)/.test(hay)) return ["b-roll"];
  return ["clip"];
}

// 初始 mock 数据 — 含 purpose 与若干 usedBy，方便演示
const INITIAL_ASSETS: Asset[] = [
  {
    id: "a1",
    name: "夏季新品-海边大片.jpg",
    type: "image",
    purpose: ["scene", "product"],
    url: SAMPLE_IMG("boop-1"),
    thumb: SAMPLE_IMG("boop-1"),
    size: "1.8 MB",
    tags: ["夏季", "新品", "海边"],
    description: "夏季主推新品户外拍摄素材，主色调蓝色。",
    uploadedAt: "2026-06-08 10:24",
    hash: "h1",
    usedBy: [
      { module: "video", refId: "vid-101", refTitle: "618 大促 30s 短视频", usedAt: "2026-06-09 11:02" },
      { module: "remix", refId: "rmx-22", refTitle: "夏季主图混剪 v3", usedAt: "2026-06-08 18:40" },
    ],
  },
  {
    id: "a2",
    name: "产品开箱-30s.mp4",
    type: "video",
    purpose: ["product-shot", "clip"],
    url: SAMPLE_VIDEO,
    thumb: SAMPLE_IMG("boop-2"),
    size: "14.6 MB",
    duration: "00:30",
    tags: ["开箱", "短视频"],
    description: "30 秒产品开箱短视频，可用于 TikTok / Reels。",
    uploadedAt: "2026-06-07 18:02",
    hash: "h2",
    usedBy: [
      { module: "video", refId: "vid-102", refTitle: "新品发布 · 海外版", usedAt: "2026-06-08 09:15" },
    ],
  },
  {
    id: "a3",
    name: "品牌轻快配乐.mp3",
    type: "audio",
    purpose: ["bgm"],
    url: SAMPLE_AUDIO,
    size: "2.4 MB",
    duration: "01:12",
    tags: ["BGM", "轻快", "品牌"],
    description: "轻快品牌背景音乐，适合产品演示。",
    uploadedAt: "2026-06-06 09:11",
    hash: "h3",
    usedBy: [
      { module: "video", refId: "vid-103", refTitle: "618 大促 30s 短视频", usedAt: "2026-06-09 11:02" },
      { module: "video", refId: "vid-104", refTitle: "品牌故事 60s", usedAt: "2026-06-05 14:20" },
      { module: "video", refId: "vid-105", refTitle: "新品发布 · 海外版", usedAt: "2026-06-08 09:15" },
    ],
  },
  {
    id: "a4",
    name: "用户好评截图-001.png",
    type: "image",
    purpose: ["ugc"],
    url: SAMPLE_IMG("boop-4"),
    thumb: SAMPLE_IMG("boop-4"),
    size: "612 KB",
    tags: ["好评", "UGC"],
    description: "用户在 Instagram 留下的好评截图。",
    uploadedAt: "2026-06-05 14:45",
    hash: "h4",
    usedBy: [],
  },
  {
    id: "a5",
    name: "厨房场景-早餐.jpg",
    type: "image",
    purpose: ["scene"],
    url: SAMPLE_IMG("boop-5"),
    thumb: SAMPLE_IMG("boop-5"),
    size: "2.1 MB",
    tags: ["场景", "厨房", "生活"],
    description: "明亮的厨房早餐场景。",
    uploadedAt: "2026-06-04 08:30",
    hash: "h5",
    usedBy: [],
  },
  {
    id: "a6",
    name: "广告解说-中文女声.mp3",
    type: "audio",
    purpose: ["voiceover"],
    url: SAMPLE_AUDIO,
    size: "3.1 MB",
    duration: "00:45",
    tags: ["配音", "中文", "女声"],
    description: "中文女声广告解说，温柔清晰。",
    uploadedAt: "2026-06-03 17:20",
    hash: "h6",
    usedBy: [
      { module: "video", refId: "vid-106", refTitle: "品牌故事 60s", usedAt: "2026-06-05 14:20" },
    ],
  },
  {
    id: "a7",
    name: "夜景城市灯光.mp4",
    type: "video",
    purpose: ["b-roll"],
    url: SAMPLE_VIDEO,
    thumb: SAMPLE_IMG("boop-7"),
    size: "22.7 MB",
    duration: "00:18",
    tags: ["城市", "夜景", "空镜"],
    description: "城市夜景灯光延时空镜素材。",
    uploadedAt: "2026-06-02 22:01",
    hash: "h7",
    usedBy: [],
  },
  {
    id: "a8",
    name: "Logo-透明底.png",
    type: "image",
    purpose: ["logo"],
    url: SAMPLE_IMG("boop-8"),
    thumb: SAMPLE_IMG("boop-8"),
    size: "84 KB",
    tags: ["Logo", "品牌"],
    description: "品牌主 Logo，透明背景，适合叠加。",
    uploadedAt: "2026-06-01 11:08",
    hash: "h8",
    usedBy: [
      { module: "image", refId: "img-301", refTitle: "海报头图生成", usedAt: "2026-06-02 10:00" },
    ],
  },
  // 去重演示数据
  {
    id: "a9",
    name: "夏季新品-海边大片(1).jpg",
    type: "image",
    purpose: ["scene"],
    url: SAMPLE_IMG("boop-1"),
    thumb: SAMPLE_IMG("boop-1"),
    size: "1.8 MB",
    tags: ["夏季", "新品"],
    description: "重复上传的同一张素材。",
    uploadedAt: "2026-06-09 09:12",
    hash: "h1",
    usedBy: [],
  },
  {
    id: "a10",
    name: "summer-hero-final.jpg",
    type: "image",
    purpose: ["scene"],
    url: SAMPLE_IMG("boop-1"),
    thumb: SAMPLE_IMG("boop-1"),
    size: "1.8 MB",
    tags: ["夏季", "海边"],
    description: "运营从设计稿重命名后再次上传。",
    uploadedAt: "2026-06-09 15:40",
    hash: "h1",
    usedBy: [],
  },
  {
    id: "a11",
    name: "产品开箱-30s-备份.mp4",
    type: "video",
    purpose: ["clip"],
    url: SAMPLE_VIDEO,
    thumb: SAMPLE_IMG("boop-2"),
    size: "14.6 MB",
    duration: "00:30",
    tags: ["开箱"],
    description: "同一支视频由不同设备分别上传。",
    uploadedAt: "2026-06-08 21:05",
    hash: "h2",
    usedBy: [],
  },
  {
    id: "a12",
    name: "BGM-轻快.mp3",
    type: "audio",
    purpose: ["bgm"],
    url: SAMPLE_AUDIO,
    size: "2.4 MB",
    duration: "01:12",
    tags: ["BGM"],
    description: "与品牌轻快配乐为同一文件，仅文件名不同。",
    uploadedAt: "2026-06-07 10:24",
    hash: "h3",
    usedBy: [],
  },
  {
    id: "a13",
    name: "厨房场景-早餐-v2.jpg",
    type: "image",
    purpose: ["scene"],
    url: SAMPLE_IMG("boop-5b"),
    thumb: SAMPLE_IMG("boop-5b"),
    size: "2.0 MB",
    tags: ["场景", "厨房"],
    description: "厨房早餐场景的另一张候选图，构图相近。",
    uploadedAt: "2026-06-04 08:32",
    hash: "h5-near",
    usedBy: [],
  },
  {
    id: "a14",
    name: "厨房场景-早餐-横版.jpg",
    type: "image",
    purpose: ["scene"],
    url: SAMPLE_IMG("boop-5c"),
    thumb: SAMPLE_IMG("boop-5c"),
    size: "2.2 MB",
    tags: ["场景", "厨房", "横版"],
    description: "同一场景的横版裁剪，可保留一张。",
    uploadedAt: "2026-06-04 08:35",
    hash: "h5-near",
    usedBy: [],
  },
  // 额外内置配音/音效，方便创作页演示
  {
    id: "a15",
    name: "广告解说-沉稳男声.mp3",
    type: "audio",
    purpose: ["voiceover"],
    url: SAMPLE_AUDIO,
    size: "3.0 MB",
    duration: "00:42",
    tags: ["配音", "男声"],
    description: "沉稳男声广告解说。",
    uploadedAt: "2026-05-30 09:00",
    hash: "h-v2",
    usedBy: [],
  },
  {
    id: "a16",
    name: "电子律动-EDM.mp3",
    type: "audio",
    purpose: ["bgm"],
    url: SAMPLE_AUDIO,
    size: "4.2 MB",
    duration: "02:02",
    tags: ["BGM", "电子"],
    description: "动感电子律动，适合快节奏短视频。",
    uploadedAt: "2026-05-28 11:30",
    hash: "h-b2",
    usedBy: [],
  },
  {
    id: "a17",
    name: "按键提示音.mp3",
    type: "audio",
    purpose: ["sfx"],
    url: SAMPLE_AUDIO,
    size: "120 KB",
    duration: "00:02",
    tags: ["音效", "提示"],
    description: "短促按键提示音效。",
    uploadedAt: "2026-05-25 16:10",
    hash: "h-sfx1",
    usedBy: [],
  },
];

// ----- 模块级 store -----
let _assets: Asset[] = [...INITIAL_ASSETS];
const _listeners = new Set<() => void>();

function emit() {
  _listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function getAssets(): Asset[] {
  return _assets;
}

export function setAssets(updater: Asset[] | ((prev: Asset[]) => Asset[])) {
  _assets = typeof updater === "function" ? (updater as (p: Asset[]) => Asset[])(_assets) : updater;
  emit();
}

export function addAssets(newAssets: Asset[]) {
  _assets = [...newAssets, ..._assets];
  emit();
}

export function updateAsset(id: string, patch: Partial<Asset>) {
  _assets = _assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
  emit();
}

export function deleteAssets(ids: string[]) {
  const set = new Set(ids);
  _assets = _assets.filter((a) => !set.has(a.id));
  emit();
}

export function recordUsage(assetId: string, entry: UsedByEntry) {
  _assets = _assets.map((a) =>
    a.id === assetId
      ? {
          ...a,
          usedBy: [entry, ...a.usedBy.filter((u) => u.refId !== entry.refId)],
        }
      : a,
  );
  emit();
}

export function removeUsage(assetId: string, refId: string) {
  _assets = _assets.map((a) =>
    a.id === assetId ? { ...a, usedBy: a.usedBy.filter((u) => u.refId !== refId) } : a,
  );
  emit();
}

// 查询助手
export function getAssetsByPurpose(
  type: AssetType | AssetType[],
  purpose?: Purpose | Purpose[],
): Asset[] {
  const types = Array.isArray(type) ? type : [type];
  const purposes = purpose ? (Array.isArray(purpose) ? purpose : [purpose]) : null;
  return _assets.filter((a) => {
    if (!types.includes(a.type)) return false;
    if (purposes && !purposes.some((p) => a.purpose.includes(p))) return false;
    return true;
  });
}

// React 订阅
export function useMaterialsStore(): Asset[] {
  return useSyncExternalStore(
    subscribe,
    getAssets,
    getAssets,
  );
}

// 仅用于 SSR 安全的 noop 占位（确保 React 在初次渲染时不会触发更新）
export function useMaterialsStoreReady() {
  // no-op hook — 占位防止 tree-shake
  useEffect(() => {}, []);
}
