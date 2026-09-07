import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationBar({
  page,
  totalPages,
  total,
  setPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  setPage: (p: number | ((p: number) => number)) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
      <span className="text-xs text-muted-foreground">
        共 <span className="font-medium text-foreground">{total}</span> 条 · 第{" "}
        {page} / {totalPages} 页
      </span>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
          let n = i + 1;
          if (totalPages > 7 && page > 4) {
            n = Math.min(totalPages - 6, page - 3) + i;
          }
          return (
            <Button
              key={n}
              size="sm"
              variant={page === n ? "default" : "ghost"}
              className="w-8 px-0"
              onClick={() => setPage(n)}
            >
              {n}
            </Button>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default PaginationBar;
