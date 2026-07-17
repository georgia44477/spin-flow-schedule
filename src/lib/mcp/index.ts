import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClassesTool from "./tools/list-classes";
import listMyBookingsTool from "./tools/list-my-bookings";
import bookClassTool from "./tools/book-class";
import cancelBookingTool from "./tools/cancel-booking";
import getProfileTool from "./tools/get-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "studio-roxx-mcp",
  title: "Studio Roxx",
  version: "0.1.0",
  instructions:
    "Studio Roxx pole studio booking. Use list_classes to browse the schedule, book_class to reserve a spot, list_my_bookings to see your bookings, cancel_booking to release a spot, and get_profile for account info. All booking actions are scoped to the signed-in user via OAuth.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClassesTool, listMyBookingsTool, bookClassTool, cancelBookingTool, getProfileTool],
});
