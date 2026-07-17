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
  name: "book_class",
  title: "Book a class",
  description:
    "Book a Studio Roxx class for the signed-in user using drop-in, class pass, or monthly subscription. Confirms capacity atomically. Signing the waiver is required — booking via MCP counts as accepting the studio waiver on file.",
  inputSchema: {
    class_id: z.string().uuid().describe("The class UUID to book."),
    tier: z
      .enum(["drop-in", "pass", "subscription"])
      .describe("Payment tier to use for this booking."),
    discount_code: z.string().optional().describe("Optional discount code."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ class_id, tier, discount_code }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = sbForUser(ctx);

    const { data: cls, error: cErr } = await sb
      .from("classes")
      .select("drop_in_price, pass_price, subscription_price, title, starts_at")
      .eq("id", class_id)
      .maybeSingle();
    if (cErr || !cls) {
      return { content: [{ type: "text", text: cErr?.message ?? "Class not found" }], isError: true };
    }

    const price =
      tier === "drop-in" ? Number(cls.drop_in_price)
      : tier === "pass" ? Number(cls.pass_price)
      : Number(cls.subscription_price);

    const { data, error } = await sb.rpc("book_class", {
      _class_id: class_id,
      _tier: tier,
      _total_amount: price,
      _discount_code: discount_code ?? null,
      _discount_percent: 0,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [
        {
          type: "text",
          text: `Booked ${cls.title} at ${cls.starts_at} (${tier}). Booking id: ${data}`,
        },
      ],
      structuredContent: { booking_id: data, class: cls, tier, price },
    };
  },
});
