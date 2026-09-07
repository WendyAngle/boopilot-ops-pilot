import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { TaskLogListPage } from "@/components/task-log-list-page";
import { useTasks } from "@/lib/operations-store";

export const Route = createFileRoute("/_app/tasks/$taskId_/logs/$logId")({
  component: LogDetailPage,
  head: () => ({ meta: [{ title: "任务日志详情 — BooPilot" }] }),
});

function LogDetailPage() {
  const { taskId, logId } = Route.useParams();
  const tasks = useTasks();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  return <TaskLogListPage task={task} taskId={taskId} selectedLogId={logId} />;
}
