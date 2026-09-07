import { type TaskRow, type Platform } from "@/lib/operations-store";

export type PostActionStat = { action: string; ok: boolean };
export type PostMedia = { type: "image" | "video"; ratio: "1:1" | "4:5" | "16:9"; hue: number; duration?: string };
export type PostRow = {
  id: string;
  title: string;
  content: string;
  platform: Platform;
  author: string;
  authorHandle: string;
  authorFollowers: number;
  publishedAt: string;
  ingestedAt: string;
  url: string;
  location?: string;
  hashtags: string[];
  media: PostMedia[];
  metrics: { views: number; likes: number; comments: number; shares: number; saves: number };
  actions: PostActionStat[];
};

export const POST_TITLES = [
  "新品发布｜夏季限定上新预告",
  "用户故事 · 来自纽约的Lily",
  "幕后花絮：拍摄日的一天",
  "限时活动：转发抽奖即将开始",
  "深度长文｜如何挑选最适合你的款式",
  "客户好评合集 · 五星反馈",
  "团队招募：我们在找你",
  "节日特辑：感恩季福利清单",
  "教程 | 三步搞定爆款短视频",
  "对比评测：A 款 vs B 款",
  "用户问答 · 本周精选",
  "门店探访：上海旗舰店开业",
  "联名预告：与 XX 品牌的故事",
  "复盘报告：618 战绩公开",
  "粉丝彩蛋｜免费壁纸下载",
  "热点追踪：行业最新趋势",
];

export const POST_ALL_ACTIONS = [
  "点赞", "评论", "发帖", "关注", "私信",
  "兴趣分析", "浏览阅读", "打开贴文", "返回流程主页面",
];

const NURTURE_POST_ACTIONS = POST_ALL_ACTIONS.filter((action) => action !== "发帖" && action !== "私信");

export function buildPosts(t: TaskRow): PostRow[] {
  const platforms = t.platforms.length ? t.platforms : (["Facebook"] as Platform[]);
  const seed = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  const count = Math.max(8, Math.min(40, Math.ceil(t.total / 6)));
  const rows: PostRow[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => (seed(`${t.id}|p${i}|${k}`) % 1000) / 1000;
    const actionPool = t.subtype === "nurture" ? NURTURE_POST_ACTIONS : POST_ALL_ACTIONS;
    const maxExtraActions = Math.max(1, actionPool.length - 2);
    const actionCount = Math.min(actionPool.length, 3 + Math.floor(r("ac") * maxExtraActions));
    const offset = Math.floor(r("off") * (actionPool.length - actionCount + 1));
    const picked = actionPool.slice(offset, offset + actionCount);
    const failRate = (t.done + t.failed) > 0 ? t.failed / (t.done + t.failed) : 0.15;
    const actions = picked.map((a, idx) => {
      const ok = r(`ok${idx}`) >= failRate;
      return { action: a, ok };
    });
    const pubHH = String(8 + (i % 12)).padStart(2, "0");
    const pubMM = String((i * 7) % 60).padStart(2, "0");
    const ingMin = (i * 7) % 60 + 3 + Math.floor(r("ing") * 25);
    const ingHH = String(8 + (i % 12) + Math.floor(ingMin / 60)).padStart(2, "0");
    const ingMM = String(ingMin % 60).padStart(2, "0");
    const mediaCount = 1 + Math.floor(r("mc") * 4);
    const hasVideo = r("hv") > 0.7;
    const ratios: PostMedia["ratio"][] = ["1:1", "4:5", "16:9"];
    const media: PostMedia[] = Array.from({ length: mediaCount }, (_, k) => {
      const isVid = hasVideo && k === 0;
      return {
        type: isVid ? "video" : "image",
        ratio: ratios[Math.floor(r(`mr${k}`) * 3)],
        hue: Math.floor(r(`mh${k}`) * 360),
        duration: isVid ? `0:${String(15 + Math.floor(r("vd") * 45)).padStart(2, "0")}` : undefined,
      };
    });
    const tagPool = ["新品", "上新", "好物推荐", "品牌故事", "用户故事", "幕后", "限时活动", "教程", "测评", "福利", "灵感", "日常"];
    const tagCount = 2 + Math.floor(r("tc") * 3);
    const hashtags = Array.from(new Set(Array.from({ length: tagCount }, (_, k) => tagPool[Math.floor(r(`tg${k}`) * tagPool.length)])));
    const cities = ["上海", "北京", "深圳", "纽约", "东京", "首尔", "巴黎", "新加坡"];
    const location = r("hl") > 0.45 ? cities[Math.floor(r("loc") * cities.length)] : undefined;
    const title = POST_TITLES[i % POST_TITLES.length] + (i >= POST_TITLES.length ? ` #${Math.floor(i / POST_TITLES.length) + 1}` : "");
    const content =
      `${title}。\n\n本期内容围绕用户最关心的细节展开，分享了灵感来源、设计思路与上手体验，并附上一段真实场景下的测评片段。` +
      `\n\n如果你也喜欢这种风格，欢迎在评论区告诉我们你的想法，点赞收藏不迷路 ✨` +
      `\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;
    const handle = `brand_${1 + (i % 3)}`;
    rows.push({
      id: `post-${t.id}-${String(i + 1).padStart(2, "0")}`,
      title,
      content,
      platform: platforms[i % platforms.length],
      author: `Brand ${1 + (i % 3)}`,
      authorHandle: `@${handle}`,
      authorFollowers: Math.round(5000 + r("fo") * 200000),
      publishedAt: `${t.createdAt.slice(0, 10)} ${pubHH}:${pubMM}`,
      ingestedAt: `${t.createdAt.slice(0, 10)} ${ingHH}:${ingMM}`,
      url: `https://${platforms[i % platforms.length].toLowerCase()}.com/${handle}/posts/${1000000 + i}`,
      location,
      hashtags,
      media,
      metrics: {
        views: Math.round(1000 + r("v") * 12000),
        likes: Math.round(50 + r("l") * 800),
        comments: Math.round(10 + r("c") * 200),
        shares: Math.round(5 + r("sh") * 120),
        saves: Math.round(5 + r("sv") * 200),
      },
      actions,
    });
  }
  return rows;
}
