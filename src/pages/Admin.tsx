import { useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import StudioHeader from "@/components/StudioHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ClassRow = {
  id: string;
  title: string;
  instructor: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced" | "all-levels";
  starts_at: string;
  duration_minutes: number;
  spots_total: number;
  drop_in_price: number;
  pass_price: number;
  subscription_price: number;
};

const emptyForm = {
  id: "",
  title: "",
  instructor: "",
  description: "",
  level: "all-levels" as ClassRow["level"],
  starts_at: new Date().toISOString().slice(0, 16),
  duration_minutes: 60,
  spots_total: 8,
  drop_in_price: 35,
  pass_price: 28,
  subscription_price: 22,
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [dayBookings, setDayBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !adminLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("starts_at", { ascending: true });
    if (data) setClasses(data as ClassRow[]);
    const { data: bks } = await supabase.from("bookings").select("class_id").eq("status", "confirmed");
    const counts: Record<string, number> = {};
    (bks ?? []).forEach((b: any) => (counts[b.class_id] = (counts[b.class_id] ?? 0) + 1));
    setBookingCounts(counts);
  };

  const loadDayBookings = async (day: Date) => {
    const from = startOfDay(day).toISOString();
    const to = endOfDay(day).toISOString();
    const { data: dayClasses } = await supabase
      .from("classes")
      .select("id, title, instructor, starts_at, spots_total")
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at");
    const ids = (dayClasses ?? []).map((c: any) => c.id);
    if (ids.length === 0) {
      setDayBookings([]);
      return;
    }
    const { data: bks } = await supabase
      .from("bookings")
      .select("id, class_id, user_id, tier, price, status, created_at")
      .in("class_id", ids);
    const grouped = (dayClasses ?? []).map((c: any) => ({
      ...c,
      bookings: (bks ?? []).filter((b: any) => b.class_id === c.id),
    }));
    setDayBookings(grouped);
  };

  useEffect(() => {
    if (isAdmin) loadClasses();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadDayBookings(selectedDay);
  }, [isAdmin, selectedDay]);

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: ClassRow) => {
    setForm({
      ...c,
      starts_at: format(new Date(c.starts_at), "yyyy-MM-dd'T'HH:mm"),
    });
    setDialogOpen(true);
  };

  const saveClass = async () => {
    const payload = {
      title: form.title,
      instructor: form.instructor,
      description: form.description,
      level: form.level,
      starts_at: new Date(form.starts_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      spots_total: Number(form.spots_total),
      drop_in_price: Number(form.drop_in_price),
      pass_price: Number(form.pass_price),
      subscription_price: Number(form.subscription_price),
    };
    if (!payload.title || !payload.instructor) {
      toast.error("Title and instructor are required");
      return;
    }
    const { error } = form.id
      ? await supabase.from("classes").update(payload).eq("id", form.id)
      : await supabase.from("classes").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Class updated" : "Class created");
    setDialogOpen(false);
    loadClasses();
    loadDayBookings(selectedDay);
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this class? Existing bookings will be affected.")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Class deleted");
    loadClasses();
    loadDayBookings(selectedDay);
  };

  const upcoming = useMemo(
    () => classes.filter((c) => new Date(c.starts_at) >= new Date(new Date().setHours(0, 0, 0, 0))),
    [classes]
  );

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <StudioHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl tracking-wider">Studio Admin</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Manage classes, capacity and view bookings by day.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> New class
          </Button>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="bookings">Bookings by day</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="mt-6">
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">When</th>
                    <th className="text-left px-4 py-3">Class</th>
                    <th className="text-left px-4 py-3">Instructor</th>
                    <th className="text-left px-4 py-3">Level</th>
                    <th className="text-left px-4 py-3">Capacity</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((c) => {
                    const booked = bookingCounts[c.id] ?? 0;
                    const full = booked >= c.spots_total;
                    return (
                      <tr key={c.id} className="border-t border-border/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {format(new Date(c.starts_at), "EEE MMM d, HH:mm")}
                        </td>
                        <td className="px-4 py-3">{c.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.instructor}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {c.level.replace("-", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("font-mono text-xs", full && "text-destructive")}>
                            {booked} / {c.spots_total}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteClass(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {upcoming.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No upcoming classes. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <div className="flex items-center gap-4 mb-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {format(selectedDay, "EEEE, MMMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDay}
                    onSelect={(d) => d && setSelectedDay(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {dayBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No classes scheduled on this day.</p>
            ) : (
              <div className="space-y-4">
                {dayBookings.map((c) => (
                  <div key={c.id} className="border border-border/50 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display text-lg tracking-wide">{c.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(c.starts_at), "HH:mm")} · {c.instructor}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">
                          {c.bookings.length} / {c.spots_total}
                        </span>
                      </div>
                    </div>
                    {c.bookings.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No bookings yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="text-muted-foreground uppercase tracking-wider">
                          <tr>
                            <th className="text-left py-2">Booking ID</th>
                            <th className="text-left py-2">Tier</th>
                            <th className="text-left py-2">Price</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-left py-2">Booked at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.bookings.map((b: any) => (
                            <tr key={b.id} className="border-t border-border/30">
                              <td className="py-2 font-mono">{b.id.slice(0, 8)}</td>
                              <td className="py-2 capitalize">{b.tier}</td>
                              <td className="py-2">${Number(b.price).toFixed(2)}</td>
                              <td className="py-2 capitalize">{b.status}</td>
                              <td className="py-2 text-muted-foreground">
                                {format(new Date(b.created_at), "MMM d, HH:mm")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit class" : "New class"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Instructor</Label>
                <Input
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Level</Label>
                <Select
                  value={form.level}
                  onValueChange={(v) => setForm({ ...form, level: v as ClassRow["level"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="all-levels">All levels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Starts</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={form.spots_total}
                  onChange={(e) => setForm({ ...form, spots_total: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Drop-in $</Label>
                <Input
                  type="number"
                  value={form.drop_in_price}
                  onChange={(e) => setForm({ ...form, drop_in_price: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Pass $</Label>
                <Input
                  type="number"
                  value={form.pass_price}
                  onChange={(e) => setForm({ ...form, pass_price: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Sub $</Label>
                <Input
                  type="number"
                  value={form.subscription_price}
                  onChange={(e) => setForm({ ...form, subscription_price: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveClass}>{form.id ? "Save changes" : "Create class"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
