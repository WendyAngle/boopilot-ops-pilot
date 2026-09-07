import { createFileRoute } from "@tanstack/react-router";

// 一次性引导接口：创建/重置演示账号。需提供 BOOTSTRAP_SECRET。
export const Route = createFileRoute("/api/public/bootstrap-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-bootstrap-secret");
        if (!secret || secret !== process.env["BOOTSTRAP_SECRET"]) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { ensureDemoUser } = await import(
          "@/lib/demo-user.functions"
        );
        const result = await ensureDemoUser();
        return Response.json(result);
      },
    },
  },
});
