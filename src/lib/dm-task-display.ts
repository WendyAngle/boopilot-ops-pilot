import type { Platform, TaskRow } from "@/lib/operations-store";

export const DM_TARGET_ACCOUNTS: Record<Platform, string[]> = {
  Facebook: [
    "Daniel Wong", "Sophia Lim", "Marcus Tan", "Elena Rossi", "Kevin Ho",
    "Priya Nair", "Jonas Weber", "Amelia Clark", "Hiroshi Sato", "Laura Gomez",
  ],
  Instagram: [
    "@skin.lab_ana", "@marco.travels", "@beauty_by_lina", "@yuki.style", "@tom_fitlife",
    "@sarah.makeup", "@urban_kai", "@nina.glowup", "@leo.shots", "@mia_daily",
  ],
  Tiktok: [
    "@glow_with_ivy", "@jayson.reviews", "@mika_beauty", "@chris.unbox", "@luna.skincare",
    "@daryl_deals", "@emma.tries", "@ken_gadget", "@zoe.routine", "@ryan.picks",
  ],
  WhatsApp: [
    "Alex Chen (+65 8123 4567)", "Rita Sharma (+91 98200 11234)", "Omar Farouk (+971 50 123 4567)",
    "Linda Park (+82 10 2345 6789)", "Peter Mensah (+234 803 456 7890)", "Nadia Haddad (+212 6 12 34 56 78)",
    "Carlos Diaz (+52 55 1234 5678)", "Tuan Nguyen (+84 90 123 4567)",
  ],
  "Twitter/X": [
    "@growth_ben", "@saas_kelly", "@devon_trades", "@ana_ecomm", "@mikeonlogistics",
    "@crossborder_li", "@julia_ships", "@ops_with_sam",
  ],
};

function stableIndex(value: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return length ? hash % length : 0;
}

export function dmTargetAccount(task: Pick<TaskRow, "id" | "platforms">): string {
  const platform = task.platforms[0] ?? "Facebook";
  const pool = DM_TARGET_ACCOUNTS[platform] ?? [];
  return pool[stableIndex(task.id, pool.length)] ?? "—";
}

export function fillDmScript(template: string, target: string, company: string, sender: string): string {
  return template
    .replace(/\{联系人名\}/g, target.replace(/^@/, ""))
    .replace(/\{我的公司\}/g, company)
    .replace(/\{我的姓名\}/g, sender);
}