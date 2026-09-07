import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

type Props = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <Card className="flex flex-col items-center justify-center gap-3 border-dashed bg-card/60 py-20 text-center shadow-[var(--shadow-card)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Construction className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">功能建设中</p>
          <p className="text-sm text-muted-foreground">
            该模块的功能细节将在后续版本中陆续上线。
          </p>
        </div>
      </Card>
    </div>
  );
}
