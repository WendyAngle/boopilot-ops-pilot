import { createServerFn } from "@tanstack/react-start";

export const DEMO_EMAIL = "demo@boopilot.com";

export const ensureDemoUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const password = process.env["DEMO_USER_PASSWORD"];
    if (!password) throw new Error("DEMO_USER_PASSWORD not set");

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existing = list?.users?.find((u) => u.email === DEMO_EMAIL);
    if (existing) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      return { ok: true, id: existing.id, updated: true };
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { display_name: "演示账号" },
    });
    if (error) throw error;
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { user_id: data.user.id, display_name: "演示账号" },
        { onConflict: "user_id" },
      );
    return { ok: true, id: data.user.id, updated: false };
  },
);
