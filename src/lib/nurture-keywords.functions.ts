import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface NurtureKeywordResult {
  /** 目标客户画像 */
  persona: string;
  /** 可直接用于社媒检索的搜索语句 */
  searchQueries: string[];
  /** 话题标签 */
  hashtags: string[];
  /** 负向排除词 */
  negativeKeywords: string[];
}

const SYSTEM_PROMPT = [
  "你是社媒运营专家，负责根据用户输入的兴趣关键词（产品品类）与目标市场，扩展生成社媒养号任务可用的搜索关键词方案。",
  "生成规则：",
  "1. 根据传入的产品品类、目标市场进行适配（语言、地区表达习惯）。",
  "2. 输出必须是可直接用于社媒检索的语句，禁止营销文案。",
  "3. 不得编造用户未提供的产品信息，保持输出简洁。",
  "4. 固定输出以下四个模块：",
  "   - persona: 目标客户画像（必须是纯文本字符串，一句话中文概括，禁止输出对象或数组）",
  "   - searchQueries: 搜索语句数组（3-6 条，优先使用目标市场语言/英文）",
  "   - hashtags: 话题标签数组（3-6 个，不含 # 号）",
  "   - negativeKeywords: 负向排除词数组（2-5 个，用于排除无关/低质内容）",
  "严格输出 JSON，不要输出任何其他内容。",
].join("\n");

export const generateNurtureKeywords = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        interestKeywords: z.string().min(1),
        platform: z.string().optional(),
        markets: z.array(z.string()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<NurtureKeywordResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI 服务未配置（缺少 LOVABLE_API_KEY）");

    const userParts = [
      `兴趣关键词（产品品类）：${data.interestKeywords}`,
      data.platform ? `目标平台：${data.platform}` : null,
      data.markets && data.markets.length > 0 ? `目标市场：${data.markets.join("、")}` : "目标市场：未指定，按通用英语市场适配",
    ].filter(Boolean);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts.join("\n") },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI 服务请求过于频繁，请稍后重试");
      if (res.status === 402) throw new Error("AI 额度不足，请联系管理员充值");
      if (res.status === 403) throw new Error("AI 服务被工作区策略禁用");
      throw new Error(`AI 生成失败（${res.status}）：${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: Partial<NurtureKeywordResult>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI 返回内容解析失败，请重试");
    }

    const asList = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 8) : [];

    // 模型偶尔会把 persona 输出为对象/数组，这里兜底压缩为一句可读文本
    const toText = (v: unknown, depth = 0): string => {
      if (typeof v === "string") return v.trim();
      if (typeof v === "number") return String(v);
      if (Array.isArray(v)) return v.map((x) => toText(x, depth + 1)).filter(Boolean).slice(0, 6).join("、");
      if (v && typeof v === "object" && depth < 2) {
        return Object.entries(v as Record<string, unknown>)
          .map(([k, val]) => `${k}: ${toText(val, depth + 1)}`)
          .slice(0, 8)
          .join("；");
      }
      return "";
    };

    const result: NurtureKeywordResult = {
      persona: toText(parsed.persona).slice(0, 300),
      searchQueries: asList(parsed.searchQueries),
      hashtags: asList(parsed.hashtags).map((h) => h.replace(/^#/, "")),
      negativeKeywords: asList(parsed.negativeKeywords),
    };
    if (result.searchQueries.length === 0) throw new Error("AI 未生成有效搜索语句，请重试");
    return result;
  });
