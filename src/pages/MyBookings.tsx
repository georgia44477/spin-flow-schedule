import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Clock, X } from "lucide-react";
import StudioHeader from "@/components/StudioHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface BookingRow {
  id: string;
  tier: string;
  price: number;
  status: string;
  created_at: string;
  classes: {
    title: string;
    instructor: string;
    starts_at: string;
    duration_minutes: number;
  } | null;
}

const MyBookings = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, tier, price, status, created_at, classes(title, instructor, starts_at, duration_minutes)")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setRows((data as unknown as BookingRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const cancel = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    toast.success("Booking cancelled");
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const now = new Date();
  const upcoming = rows.filter((r) => r.classes && new Date(r.classes.starts_at) >= now && r.status === "confirmed");
  const past = rows.filter((r) => !upcoming.includes(r));

  const renderBooking = (b: BookingRow) => {
    if (!b.classes) return null;
    const dt = new Date(b.classes.starts_at);
    const isPast = dt < now;
    const isCancelled = b.status === "cancelled";
    return (
      <div
        key={b.id}
        className={cn(
          "bg-card border border-border/50 rounded-lg p-5 flex items-center gap-5",
          (isPast || isCancelled) && "opacity-60"
        )}
      >
        <div className="flex-shrink-0 text-center w-16">
          <div className="font-display text-2xl text-foreground">{format(dt, "d")}</div>
          <div className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {format(dt, "MMM")}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg tracking-wide text-foreground">{b.classes.title}</h3>
          <p className="font-body text-sm text-muted-foreground">{b.classes.instructor}</p>
          <div className="flex items-center gap-3 mt-1 text-muted-foreground">
            <span className="flex items-center gap-1 font-body text-xs">
              <Clock className="w-3 h-3" /> {format(dt, "HH:mm")} · {b.classes.duration_minutes} min
            </span>
            <span className="font-body text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-sm bg-secondary">
              {b.tier}
            </span>
            {isCancelled && (
              <span className="font-body text-[10px] tracking-wider uppercase text-accent">Cancelled</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-body text-sm font-semibold text-primary">${Number(b.price).toFixed(2)}</div>
          {!isPast && !isCancelled && (
            <button
              onClick={() => cancel(b.id)}
              className="mt-2 flex items-center gap-1 font-body text-[10px] tracking-wider uppercase text-muted-foreground hover:text-accent transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudioHeader />
      <main className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="w-6 h-6 text-primary" />
          <h2 className="font-display text-3xl tracking-wide text-foreground">My Bookings</h2>
        </div>

        {loading ? (
          <p className="font-body text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-xl text-muted-foreground/50">No bookings yet</p>
            <Link to="/" className="font-body text-sm text-primary hover:underline mt-2 inline-block">
              Browse classes
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h3 className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
                  Upcoming
                </h3>
                <div className="space-y-3">{upcoming.map(renderBooking)}</div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h3 className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
                  Past & Cancelled
                </h3>
                <div className="space-y-3">{past.map(renderBooking)}</div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyBookings;
