import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardTone =
  | "primary"
  | "success"
  | "warning"
  | "violet"
  | "muted"
  | "destructive";

const TONE_CLS: Record<StatCardTone, string> = {
  primary: "from-primary/15 to-primary/5 text-primary",
  success: "from-success/15 to-success/5 text-success",
  warning: "from-warning/15 to-warning/5 text-warning",
  violet: "from-violet-500/15 to-violet-500/5 text-violet-600",
  muted: "from-muted to-muted/50 text-muted-foreground",
  destructive: "from-destructive/15 to-destructive/5 text-destructive",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "muted",
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  tone?: StatCardTone;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <div className={cn("rounded-xl bg-gradient-to-br p-2", TONE_CLS[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
