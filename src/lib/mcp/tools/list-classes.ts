import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_classes",
  title: "List classes",
  description:
    "List upcoming Studio Roxx classes on the schedule, with instructor, level, capacity, and pricing. Public data — anyone signed in can browse.",
  inputSchema: {
    days_ahead: z
      .number()
      .int()
      .optional()
      .describe("How many days ahead to fetch (default 14, max 60)."),
    level: z.string().optional().describe("Filter by class level (e.g. Beginner, Intermediate)."),
    instructor: z.string().optional().describe("Filter by instructor name (partial match)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days_ahead, level, instructor }) => {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const days = Math.min(Math.max(days_ahead ?? 14, 1), 60);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + days);

    let q = sb
      .from("classes")
      .select(
        "id, title, instructor, level, starts_at, duration_minutes, spots_total, drop_in_price, pass_price, subscription_price, description",
      )
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at");
    if (level) q = q.eq("level", level);
    if (instructor) q = q.ilike("instructor", `%${instructor}%`);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { classes: data ?? [] },
    };
  },
});
