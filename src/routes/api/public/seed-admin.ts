import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "admin@intentlock.local";
const ADMIN_PASSWORD = "admin1!";

export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Check if user already exists
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (listErr) return new Response(listErr.message, { status: 500 });

        let userId = list.users.find((u) => u.email === ADMIN_EMAIL)?.id;

        if (!userId) {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
          });
          if (createErr || !created.user) {
            return new Response(createErr?.message ?? "create failed", { status: 500 });
          }
          userId = created.user.id;
        } else {
          // Ensure password is current
          await supabaseAdmin.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
        }

        // Grant operator role (idempotent via unique constraint)
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "operator" as const }, { onConflict: "user_id,role" });
        if (roleErr) return new Response(roleErr.message, { status: 500 });

        return new Response(
          JSON.stringify({ ok: true, user_id: userId, email: ADMIN_EMAIL }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});