import { Sparkles, Zap, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BillingPricing } from "@/lib/use-billing-pricing";

/** AI 创作模块统一积分定价展示（实付 / 原价 / 会员折扣） */
export function PricingFooter({
  pricing,
  size = "lg",
  align = "between",
}: {
  pricing: BillingPricing;
  size?: "sm" | "lg";
  align?: "between" | "compact";
}) {
  const { final, original, saved, planLabel, planBadgeCls, discountText, disabled, disabledReason } =
    pricing;

  if (disabled) {
    return (
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Ban className="h-3.5 w-3.5" />
          <span>{disabledReason ?? "当前套餐不可用"}</span>
        </div>
        <Badge variant="outline" className={cn("rounded-full", planBadgeCls)}>
          {planLabel}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-3", align === "between" ? "justify-between" : "")}>
      <div>
        <div className="text-[11px] text-muted-foreground">实付积分</div>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "font-bold tabular-nums text-foreground",
              size === "lg" ? "text-2xl" : "text-lg",
            )}
          >
            {final}
          </span>
          <Zap className="h-4 w-4 text-warning" />
        </div>
      </div>
      <div className="text-right text-[11px] text-muted-foreground leading-tight">
        <div>
          原价 <span className="line-through tabular-nums">{original}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <Badge
            variant="outline"
            className={cn("h-4 gap-0.5 rounded-full px-1.5 py-0 text-[10px]", planBadgeCls)}
          >
            {planLabel}
          </Badge>
          <Badge variant="secondary" className="h-4 gap-0.5 bg-success/10 px-1.5 py-0 text-[10px] text-success">
            <Sparkles className="h-2.5 w-2.5" /> {discountText}
          </Badge>
          {saved > 0 && <span className="tabular-nums">省 {saved}</span>}
        </div>
      </div>
    </div>
  );
}
