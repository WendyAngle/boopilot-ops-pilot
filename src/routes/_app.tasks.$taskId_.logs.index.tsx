import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { TaskLogListPage } from "@/components/task-log-list-page";
import { useTasks } from "@/lib/operations-store";

export const Route = createFileRoute("/_app/tasks/$taskId_/logs/")({
  component: TaskLogsPage,
  head: () => ({ meta: [{ title: "任务日志列表 — BooPilot" }] }),
});

function TaskLogsPage() {
  const { taskId } = Route.useParams();
  const tasks = useTasks();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  return <TaskLogListPage task={task} taskId={taskId} />;
}
