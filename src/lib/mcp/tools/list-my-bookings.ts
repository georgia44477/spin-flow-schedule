import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sbForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_bookings",
  title: "List my bookings",
  description: "List the signed-in user's bookings, including upcoming and past classes.",
  inputSchema: {
    scope: z
      .enum(["upcoming", "past", "all"])
      .optional()
      .describe("Filter bookings by time (default: upcoming)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ scope }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await sbForUser(ctx)
      .from("bookings")
      .select(
        "id, tier, price, status, created_at, classes(id, title, instructor, starts_at, duration_minutes)",
      )
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const now = Date.now();
    const s = scope ?? "upcoming";
    const rows = (data ?? []).filter((b) => {
      const c = b.classes as { starts_at?: string } | null;
      if (!c?.starts_at) return s === "all";
      const t = new Date(c.starts_at).getTime();
      if (s === "upcoming") return t >= now && b.status === "confirmed";
      if (s === "past") return t < now;
      return true;
    });

    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { bookings: rows },
    };
  },
});
