// 字幕效果预设（视频生成 / 视频混剪共用）
// 与「AI 预设物料」按名称匹配筛选，只暴露 active 的预设。

import { getPresets } from "@/lib/ai-presets-mock";

export type SubtitlePreset = {
  id: string;
  name: string;
  bgClass: string;
  textStyle: React.CSSProperties;
};

const _ALL: SubtitlePreset[] = [
  { id: "shadow3d", name: "3D阴影", bgClass: "bg-gradient-to-br from-indigo-200 to-indigo-400", textStyle: { color: "#fff", fontWeight: 800, fontSize: 18, textShadow: "2px 2px 0 #ff3d7f, 4px 4px 0 #1f1f1f", letterSpacing: 0.5 } },
  { id: "block", name: "区块强调", bgClass: "bg-gradient-to-br from-slate-200 to-slate-300", textStyle: { color: "#fff", fontWeight: 700, fontSize: 14, background: "#e11d48", padding: "4px 10px", borderRadius: 2 } },
  { id: "border", name: "边框", bgClass: "bg-gradient-to-br from-amber-100 to-amber-200", textStyle: { color: "#111", fontWeight: 700, fontSize: 14, background: "#fff", padding: "4px 10px", border: "2px solid #111", borderRadius: 4 } },
  { id: "classic-black", name: "经典黑条", bgClass: "bg-gradient-to-br from-zinc-200 to-zinc-300", textStyle: { color: "#fff", fontWeight: 600, fontSize: 14, background: "#000", padding: "3px 10px" } },
  { id: "classic-white", name: "经典白条", bgClass: "bg-gradient-to-br from-slate-700 to-slate-900", textStyle: { color: "#111", fontWeight: 600, fontSize: 14, background: "#fff", padding: "3px 10px" } },
  { id: "dark", name: "黑暗", bgClass: "bg-gradient-to-br from-neutral-800 to-neutral-950", textStyle: { color: "#f5f5f5", fontWeight: 700, fontSize: 16, textShadow: "0 0 6px rgba(0,0,0,0.9)" } },
  { id: "fresh", name: "清新", bgClass: "bg-gradient-to-br from-emerald-100 to-sky-200", textStyle: { color: "#0ea5e9", fontWeight: 700, fontSize: 16, textShadow: "0 1px 0 #fff, 0 0 6px rgba(255,255,255,0.8)" } },
  { id: "tilt", name: "倾斜", bgClass: "bg-gradient-to-br from-rose-100 to-rose-300", textStyle: { color: "#fff", fontWeight: 800, fontSize: 16, background: "#111", padding: "3px 10px", transform: "skewX(-12deg)", fontStyle: "italic" } },
  { id: "lemon", name: "柠檬", bgClass: "bg-gradient-to-br from-yellow-100 to-yellow-300", textStyle: { color: "#facc15", fontWeight: 900, fontSize: 18, WebkitTextStroke: "1px #1f2937", textShadow: "2px 2px 0 #1f2937" } },
  { id: "neon", name: "霓虹", bgClass: "bg-gradient-to-br from-slate-900 to-purple-950", textStyle: { color: "#fff", fontWeight: 800, fontSize: 16, textShadow: "0 0 4px #f0f, 0 0 8px #f0f, 0 0 12px #0ff, 0 0 18px #0ff" } },
  { id: "outline-hi", name: "轮廓高亮", bgClass: "bg-gradient-to-br from-fuchsia-200 to-fuchsia-400", textStyle: { color: "#fde047", fontWeight: 800, fontSize: 16, WebkitTextStroke: "1.5px #111" } },
  { id: "translucent", name: "半透明", bgClass: "bg-gradient-to-br from-slate-400 to-slate-600", textStyle: { color: "#fff", fontWeight: 600, fontSize: 14, background: "rgba(0,0,0,0.35)", padding: "3px 10px", borderRadius: 4, backdropFilter: "blur(2px)" } },
  { id: "shadow-block", name: "阴影区块强调", bgClass: "bg-gradient-to-br from-orange-100 to-orange-300", textStyle: { color: "#fff", fontWeight: 700, fontSize: 14, background: "#ea580c", padding: "4px 10px", borderRadius: 2, boxShadow: "4px 4px 0 #1f2937" } },
  { id: "spotlight", name: "聚光灯区块强调", bgClass: "bg-gradient-to-br from-slate-800 to-slate-950", textStyle: { color: "#111", fontWeight: 800, fontSize: 14, background: "#fde047", padding: "4px 10px", boxShadow: "0 0 20px 6px rgba(253,224,71,0.6)" } },
  { id: "bar-hi", name: "白条式高亮", bgClass: "bg-gradient-to-br from-cyan-100 to-cyan-300", textStyle: { color: "#0f172a", fontWeight: 700, fontSize: 14, background: "linear-gradient(transparent 55%, #fff 55%)", padding: "0 4px" } },
  { id: "white-outline", name: "白色轮廓", bgClass: "bg-gradient-to-br from-violet-300 to-violet-500", textStyle: { color: "#1f2937", fontWeight: 800, fontSize: 16, WebkitTextStroke: "2px #fff" } },
];

const _ACTIVE_NAMES = new Set(
  getPresets()
    .filter((p) => p.category === "subtitle-style" && p.status === "active")
    .map((p) => p.name),
);

export const SUBTITLE_PRESETS: SubtitlePreset[] = _ALL.filter((p) =>
  _ACTIVE_NAMES.has(p.name),
);
