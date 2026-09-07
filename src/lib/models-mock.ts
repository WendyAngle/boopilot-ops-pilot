export type ModelStatus = "active" | "inactive";
export type PricingType = "free" | "paid";
export type AppModule =
  | "image2video"
  | "text2video"
  | "text2image"
  | "image2image"
  | "video_erase"
  | "image_erase"
  | "replicate"
  | "remix"
  | "account_post";

export const MODULE_OPTIONS: { value: AppModule; label: string }[] = [
  { value: "image2video", label: "图生视频" },
  { value: "text2video", label: "文生视频" },
  { value: "text2image", label: "文生图" },
  { value: "image2image", label: "图生图" },
  { value: "video_erase", label: "视频内容消除" },
  { value: "image_erase", label: "图片内容消除" },
  { value: "replicate", label: "爆款复刻" },
  { value: "remix", label: "视频混剪" },
  { value: "account_post", label: "养号及发帖任务" },
];

export const MODULE_LABEL: Record<AppModule, string> = MODULE_OPTIONS.reduce(
  (acc, m) => ((acc[m.value] = m.label), acc),
  {} as Record<AppModule, string>,
);

export const PRICING_LABEL: Record<PricingType, string> = {
  free: "开源免费",
  paid: "付费",
};

export interface ModelItem {
  id: string;
  name: string;
  apiName: string;
  apiKey: string;
  modules: AppModule[];
  status: ModelStatus;
  vendor: string;
  pricing: PricingType | "";
  remark: string;
  createdAt: string;
}

function mkId(seed: string) {
  return `MDL-${seed.toUpperCase().padEnd(8, "0")}`;
}

export const MOCK_MODELS: ModelItem[] = [
  // 图片内容消除
  { id: mkId("LAMA01"), name: "LaMa", apiName: "lama-inpaint", apiKey: "sk-lama-************", modules: ["image_erase"], status: "active", vendor: "Samsung Research", pricing: "free", remark: "基于傅里叶卷积的大掩码图像修复模型,擅长去除大面积遮挡物。", createdAt: "2026-05-12 10:24:11" },
  { id: mkId("BRUSHNT"), name: "BrushNet", apiName: "brushnet-v1", apiKey: "sk-brushnet-************", modules: ["image_erase"], status: "active", vendor: "腾讯 ARC Lab", pricing: "free", remark: "即插即用的双分支扩散修复模型,边缘自然度好。", createdAt: "2026-05-14 15:02:45" },
  { id: mkId("MAT0001"), name: "MAT", apiName: "mat-inpaint", apiKey: "sk-mat-************", modules: ["image_erase"], status: "inactive", vendor: "香港中文大学", pricing: "free", remark: "Mask-Aware Transformer,适合高分辨率图片修复。", createdAt: "2026-05-15 09:18:30" },
  { id: mkId("ZITSPP"), name: "ZITS++", apiName: "zits-plus-plus", apiKey: "sk-zits-************", modules: ["image_erase"], status: "active", vendor: "中国科学技术大学", pricing: "free", remark: "结构先验增强的图像修复,对线条结构恢复效果好。", createdAt: "2026-05-18 14:50:02" },
  { id: mkId("KOLORSI"), name: "Kolors-Inpainting", apiName: "kolors-inpaint", apiKey: "sk-kolors-************", modules: ["image_erase"], status: "active", vendor: "快手 可灵团队", pricing: "paid", remark: "可灵图像修复版本,中文场景表现优秀。", createdAt: "2026-05-20 11:32:19" },

  // 视频内容消除
  { id: mkId("PROPAIN"), name: "ProPainter", apiName: "propainter-v1", apiKey: "sk-propainter-************", modules: ["video_erase"], status: "active", vendor: "南洋理工 S-Lab", pricing: "free", remark: "改进的光流传播 + Transformer 视频修复,时序一致性强。", createdAt: "2026-05-21 16:11:55" },
  { id: mkId("E2FGVI0"), name: "E2FGVI", apiName: "e2fgvi-hq", apiKey: "sk-e2fgvi-************", modules: ["video_erase"], status: "active", vendor: "南开大学", pricing: "free", remark: "端到端流引导视频修复,推理速度较快。", createdAt: "2026-05-22 09:45:08" },
  { id: mkId("DIFFERA"), name: "DiffuEraser", apiName: "diffu-eraser", apiKey: "sk-differaser-************", modules: ["video_erase"], status: "active", vendor: "阿里巴巴 通义实验室", pricing: "paid", remark: "基于扩散模型的视频内容消除,适合复杂背景填充。", createdAt: "2026-05-24 13:27:40" },
  { id: mkId("FUSEFMR"), name: "FuseFormer", apiName: "fuseformer", apiKey: "sk-fuseformer-************", modules: ["video_erase"], status: "inactive", vendor: "香港中文大学", pricing: "free", remark: "细粒度特征融合的视频修复 Transformer。", createdAt: "2026-05-25 10:09:12" },
  { id: mkId("FGT0001"), name: "FGT", apiName: "fgt-video", apiKey: "sk-fgt-************", modules: ["video_erase"], status: "active", vendor: "北京大学", pricing: "free", remark: "光流引导的视频修复 Transformer,运动物体消除效果好。", createdAt: "2026-05-26 19:38:25" },

  // 图生视频
  { id: mkId("WAN26FL"), name: "Wan 2.6 Flash", apiName: "wan-2.6-flash-i2v", apiKey: "sk-wan-************", modules: ["image2video", "replicate", "remix"], status: "active", vendor: "阿里巴巴 通义万相", pricing: "paid", remark: "通义万相 2.6 极速版,出片速度快,适合批量生产。", createdAt: "2026-06-01 09:12:48" },
  { id: mkId("LTX23I2"), name: "LTX 2.3", apiName: "ltx-2.3-i2v", apiKey: "sk-ltx-************", modules: ["image2video", "replicate", "remix"], status: "active", vendor: "Lightricks", pricing: "paid", remark: "Lightricks 实时视频模型,延迟低,镜头运动自然。", createdAt: "2026-06-02 14:25:36" },
  { id: mkId("VIDUQ3P"), name: "Vidu Q3 Pro", apiName: "vidu-q3-pro-i2v", apiKey: "sk-vidu-************", modules: ["image2video", "replicate", "remix"], status: "active", vendor: "生数科技", pricing: "paid", remark: "Vidu Q3 专业版,人物一致性强,适合 IP 形象延伸。", createdAt: "2026-06-03 11:48:09" },
  { id: mkId("SEEDC20"), name: "Seedance 2.0", apiName: "seedance-2.0-i2v", apiKey: "sk-seedance-************", modules: ["image2video", "replicate", "remix"], status: "active", vendor: "字节跳动", pricing: "paid", remark: "豆包 Seedance 2.0 图生视频,运镜流畅,光影自然。", createdAt: "2026-06-04 16:03:51" },
  { id: mkId("KLING3S"), name: "Kling 3.0 Standard", apiName: "kling-3.0-std-i2v", apiKey: "sk-kling-************", modules: ["image2video", "text2video", "replicate", "remix"], status: "active", vendor: "快手 可灵", pricing: "paid", remark: "可灵 3.0 标准版,支持图生/文生视频双能力。", createdAt: "2026-06-05 10:20:14" },
  { id: mkId("LUMARY2"), name: "Luma Ray 2", apiName: "luma-ray-2-i2v", apiKey: "sk-luma-************", modules: ["image2video", "replicate", "remix"], status: "inactive", vendor: "Luma AI", pricing: "paid", remark: "Ray 2 模型,海外场景表现优,适合英文素材。", createdAt: "2026-06-06 09:47:22" },

  // 文生视频
  { id: mkId("VEO31LT"), name: "Veo 3.1 Lite", apiName: "veo-3.1-lite-t2v", apiKey: "sk-veo-************", modules: ["text2video", "replicate", "remix"], status: "active", vendor: "Google DeepMind", pricing: "paid", remark: "Veo 3.1 轻量版,提示词理解强,适合长描述生成。", createdAt: "2026-06-07 13:11:05" },
  { id: mkId("WAN2600"), name: "Wan 2.6", apiName: "wan-2.6-t2v", apiKey: "sk-wan26-************", modules: ["text2video", "replicate", "remix"], status: "active", vendor: "阿里巴巴 通义万相", pricing: "paid", remark: "通义万相 2.6 文生视频标准版,画质高,语义贴合度好。", createdAt: "2026-06-08 15:34:42" },
  { id: mkId("SEEDFST"), name: "Seedance 2.0 Fast", apiName: "seedance-2.0-fast-t2v", apiKey: "sk-seedance-fast-************", modules: ["text2video", "replicate", "remix"], status: "active", vendor: "字节跳动", pricing: "paid", remark: "豆包 Seedance 2.0 极速文生视频,成本低,适合草稿。", createdAt: "2026-06-09 10:58:29" },

  // 图生视频 / 文生视频 — 行业 Top 模型补充
  { id: mkId("KLINGV16"), name: "Kling v1.6", apiName: "kling-v1.6", apiKey: "sk-kling16-************", modules: ["image2video", "text2video", "replicate", "remix"], status: "active", vendor: "快手 可灵", pricing: "paid", remark: "画质顶级、动作流畅,国产视频生成领先模型。", createdAt: "2026-05-28 09:15:33" },
  { id: mkId("RUNGEN3"), name: "Runway Gen-3", apiName: "runway-gen-3", apiKey: "sk-runway-************", modules: ["image2video", "text2video", "replicate", "remix"], status: "active", vendor: "Runway", pricing: "paid", remark: "专业视频创作,工具链完整、控制精细。", createdAt: "2026-05-29 11:42:18" },
  { id: mkId("PIKA20"), name: "Pika 2.0", apiName: "pika-2.0", apiKey: "sk-pika-************", modules: ["image2video", "text2video", "replicate", "remix"], status: "active", vendor: "Pika Labs", pricing: "paid", remark: "易用性强、特效丰富,适合创意短视频。", createdAt: "2026-05-30 14:08:55" },
  { id: mkId("SORA01"), name: "Sora", apiName: "sora-v1", apiKey: "sk-sora-************", modules: ["text2video", "replicate", "remix"], status: "active", vendor: "OpenAI", pricing: "paid", remark: "时长最长、物理理解强,适合长视频生成。", createdAt: "2026-05-31 08:50:21" },
  { id: mkId("SVD01"), name: "Stable Video Diffusion", apiName: "stable-video-diffusion", apiKey: "sk-svd-************", modules: ["image2video", "replicate", "remix"], status: "active", vendor: "Stability AI", pricing: "free", remark: "开源免费、可本地部署定制。", createdAt: "2026-06-01 16:22:47" },

  // 文生图 / 图生图
  { id: mkId("FLUXPRO"), name: "FLUX.1 [pro]", apiName: "flux-1-pro", apiKey: "sk-flux-************", modules: ["text2image", "image2image"], status: "active", vendor: "Black Forest Labs", pricing: "paid", remark: "商业级图像生成,顶级画质、提示词理解精准。", createdAt: "2026-06-02 09:33:12" },
  { id: mkId("IDEOG30"), name: "Ideogram 3.0", apiName: "ideogram-3.0", apiKey: "sk-ideogram-************", modules: ["text2image"], status: "active", vendor: "Ideogram", pricing: "paid", remark: "文字渲染能力最强,适合海报、Logo 场景。", createdAt: "2026-06-02 13:21:44" },
  { id: mkId("SD35"), name: "Stable Diffusion 3.5", apiName: "stable-diffusion-3.5", apiKey: "sk-sd35-************", modules: ["text2image", "image2image"], status: "active", vendor: "Stability AI", pricing: "free", remark: "开源可控,生态丰富,适合本地部署与定制化。", createdAt: "2026-06-03 10:11:08" },
  { id: mkId("DALLE3"), name: "DALL-E 3", apiName: "dall-e-3", apiKey: "sk-dalle3-************", modules: ["text2image"], status: "active", vendor: "OpenAI", pricing: "paid", remark: "自然语言友好,简单易用,适合 ChatGPT 用户。", createdAt: "2026-06-03 15:48:36" },
  { id: mkId("MJV7"), name: "Midjourney v7", apiName: "midjourney-v7", apiKey: "sk-mj-************", modules: ["text2image", "image2image"], status: "active", vendor: "Midjourney", pricing: "paid", remark: "风格独特、艺术性强,适合艺术创作。", createdAt: "2026-06-04 11:05:29" },
  { id: mkId("IMAGEN4"), name: "Imagen 4", apiName: "imagen-4", apiKey: "sk-imagen4-************", modules: ["text2image"], status: "active", vendor: "Google", pricing: "paid", remark: "企业级应用,Google 技术背书,稳定可靠。", createdAt: "2026-06-04 17:32:50" },
  { id: mkId("RECRAFT4"), name: "Recraft V4", apiName: "recraft-v4", apiKey: "sk-recraft-************", modules: ["text2image"], status: "active", vendor: "Recraft", pricing: "paid", remark: "矢量输出、设计友好,适合矢量图与设计稿。", createdAt: "2026-06-05 09:14:02" },
  { id: mkId("WANXIANG"), name: "通义万相 (图像)", apiName: "wanxiang-image", apiKey: "sk-wanxiang-************", modules: ["text2image", "image2image"], status: "active", vendor: "阿里云", pricing: "paid", remark: "中文友好、合规便捷,适合国内业务场景。", createdAt: "2026-06-05 14:27:19" },
];


/** Active models for one or more application modules. */
export function getActiveModelsByModules(modules: AppModule | AppModule[]): ModelItem[] {
  const set = new Set(Array.isArray(modules) ? modules : [modules]);
  return MOCK_MODELS.filter(
    (m) => m.status === "active" && m.modules.some((mod) => set.has(mod)),
  );
}
