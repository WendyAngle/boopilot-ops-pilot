import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { TaskLogListPage } from "@/components/task-log-list-page";
import { useTasks } from "@/lib/operations-store";

export const Route = createFileRoute("/_app/tasks/$taskId_/logs/sub/$subId")({
  component: SubTaskLogsPage,
  head: () => ({ meta: [{ title: "子任务日志 — BooPilot" }] }),
});

function SubTaskLogsPage() {
  const { taskId, subId } = Route.useParams();
  const tasks = useTasks();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  return (
    <TaskLogListPage
      task={task}
      taskId={taskId}
      subTaskId={subId}
      subTaskLabel={subId}
    />
  );
}

