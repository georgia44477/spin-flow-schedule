import { useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Pencil, Plus, Trash2, Users, Tag, User, Cog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useStudioSettings } from "@/hooks/useStudioSettings";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ClassLevel = "Intro" | "Foundations" | "Intermediate" | "Advanced" | "All Levels";

interface ClassRow {
  id: string;
  title: string;
  instructor: string;
  description: string;
  level: ClassLevel;
  starts_at: string;
  duration_minutes: number;
  spots_total: number;
  drop_in_price: number;
  pass_price: number;
  subscription_price: number;
}

interface DiscountRow {
  id: string;
  code: string;
  percent_off: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
}

interface InstructorRow {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
}

const LEVELS: ClassLevel[] = ["Intro", "Foundations", "Intermediate", "Advanced", "All Levels"];

const emptyClass = {
  id: "",
  title: "",
  instructor: "",
  description: "",
  level: "All Levels" as ClassLevel,
  starts_at: new Date().toISOString().slice(0, 16),
  duration_minutes: 60,
  spots_total: 8,
  drop_in_price: 35,
  pass_price: 28,
  subscription_price: 22,
};

const emptyDiscount = {
  id: "",
  code: "",
  percent_off: 10,
  is_active: true,
  starts_at: "",
  ends_at: "",
  max_redemptions: "" as string | number,
};

const emptyInstructor = { id: "", name: "", bio: "", photo_url: "", is_active: true };

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { settings, refresh: refreshSettings } = useStudioSettings();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [classForm, setClassForm] = useState(emptyClass);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState(emptyDiscount);
  const [instructorDialogOpen, setInstructorDialogOpen] = useState(false);
  const [instructorForm, setInstructorForm] = useState(emptyInstructor);

  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [dayBookings, setDayBookings] = useState<{ id: string; title: string; instructor: string; starts_at: string; spots_total: number; bookings: { id: string; user_id: string; tier: string; price: number; status: string; created_at: string }[] }[]>([]);

  const [settingsForm, setSettingsForm] = useState(settings);
  useEffect(() => setSettingsForm(settings), [settings]);

  useEffect(() => {
    if (!authLoading && !adminLoading && (!user || !isAdmin)) navigate("/");
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("starts_at", { ascending: true });
    if (data) setClasses(data as ClassRow[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: avail } = await (supabase.rpc as any)("class_availability", {
      _from: new Date(0).toISOString(),
      _to: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    });
    const counts: Record<string, number> = {};
    ((avail as { class_id: string; confirmed_count: number }[]) ?? []).forEach((r) => (counts[r.class_id] = r.confirmed_count));
    setBookingCounts(counts);
  };

  const loadDiscounts = async () => {
    const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    if (data) setDiscounts(data as DiscountRow[]);
  };

  const loadInstructors = async () => {
    const { data } = await supabase.from("instructors").select("*").order("name");
    if (data) setInstructors(data as InstructorRow[]);
  };

  const loadDayBookings = async (day: Date) => {
    const from = startOfDay(day).toISOString();
    const to = endOfDay(day).toISOString();
    const { data: dayClasses } = await supabase
      .from("classes")
      .select("id, title, instructor, starts_at, spots_total")
      .gte("starts_at", from).lte("starts_at", to).order("starts_at");
    const ids = (dayClasses ?? []).map((c) => c.id);
    if (ids.length === 0) { setDayBookings([]); return; }
    const { data: bks } = await supabase
      .from("bookings")
      .select("id, class_id, user_id, tier, price, status, created_at")
      .in("class_id", ids);
    const userIds = Array.from(new Set((bks ?? []).map((b) => b.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p.display_name ?? p.id.slice(0, 8)));
      setProfiles(map);
    }
    const grouped = (dayClasses ?? []).map((c) => ({
      ...c,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookings: (bks ?? []).filter((b: any) => b.class_id === c.id),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDayBookings(grouped as any);
  };

  useEffect(() => {
    if (isAdmin) { loadClasses(); loadDiscounts(); loadInstructors(); }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadDayBookings(selectedDay);
  }, [isAdmin, selectedDay]);

  const upcoming = useMemo(
    () => classes.filter((c) => new Date(c.starts_at) >= new Date(new Date().setHours(0, 0, 0, 0))),
    [classes]
  );

  const saveClass = async () => {
    const payload = {
      title: classForm.title,
      instructor: classForm.instructor,
      description: classForm.description,
      level: classForm.level,
      starts_at: new Date(classForm.starts_at).toISOString(),
      duration_minutes: Number(classForm.duration_minutes),
      spots_total: Number(classForm.spots_total),
      drop_in_price: Number(classForm.drop_in_price),
      pass_price: Number(classForm.pass_price),
      subscription_price: Number(classForm.subscription_price),
    };
    if (!payload.title || !payload.instructor) { toast.error("Title and instructor are required"); return; }
    const { error } = classForm.id
      ? await supabase.from("classes").update(payload).eq("id", classForm.id)
      : await supabase.from("classes").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(classForm.id ? "Class updated" : "Class created");
    setClassDialogOpen(false);
    loadClasses(); loadDayBookings(selectedDay);
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this class? Existing bookings will be affected.")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Class deleted");
    loadClasses(); loadDayBookings(selectedDay);
  };

  const saveDiscount = async () => {
    const code = discountForm.code.trim().toUpperCase();
    if (!code) { toast.error("Code is required"); return; }
    const payload = {
      code,
      percent_off: Number(discountForm.percent_off),
      is_active: discountForm.is_active,
      starts_at: discountForm.starts_at ? new Date(discountForm.starts_at).toISOString() : null,
      ends_at: discountForm.ends_at ? new Date(discountForm.ends_at).toISOString() : null,
      max_redemptions: discountForm.max_redemptions === "" ? null : Number(discountForm.max_redemptions),
    };
    const { error } = discountForm.id
      ? await supabase.from("discount_codes").update(payload).eq("id", discountForm.id)
      : await supabase.from("discount_codes").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Discount saved");
    setDiscountDialogOpen(false);
    loadDiscounts();
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm("Delete this discount code?")) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    loadDiscounts();
  };

  const saveInstructor = async () => {
    if (!instructorForm.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: instructorForm.name.trim(),
      bio: instructorForm.bio || null,
      photo_url: instructorForm.photo_url || null,
      is_active: instructorForm.is_active,
    };
    const { error } = instructorForm.id
      ? await supabase.from("instructors").update(payload).eq("id", instructorForm.id)
      : await supabase.from("instructors").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Instructor saved");
    setInstructorDialogOpen(false);
    loadInstructors();
  };

  const deleteInstructor = async (id: string) => {
    if (!confirm("Remove this instructor?")) return;
    const { error } = await supabase.from("instructors").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    loadInstructors();
  };

  const saveSettings = async () => {
    const { error } = await supabase.from("studio_settings").update({
      studio_name: settingsForm.studio_name,
      tagline: settingsForm.tagline,
      timezone: settingsForm.timezone,
      logo_url: settingsForm.logo_url,
      hero_image_url: settingsForm.hero_image_url,
      primary_color: settingsForm.primary_color,
      contact_email: settingsForm.contact_email,
    }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Studio settings saved");
    refreshSettings();
  };

  if (authLoading || adminLoading) return <div className="min-h-screen bg-background" />;
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <StudioHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl tracking-wider">Studio Admin</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Manage classes, discount codes, instructors and studio branding.
            </p>
          </div>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="bookings">Bookings by day</TabsTrigger>
            <TabsTrigger value="discounts"><Tag className="w-3.5 h-3.5 mr-1.5" />Discounts</TabsTrigger>
            <TabsTrigger value="instructors"><User className="w-3.5 h-3.5 mr-1.5" />Instructors</TabsTrigger>
            <TabsTrigger value="settings"><Cog className="w-3.5 h-3.5 mr-1.5" />Settings</TabsTrigger>
          </TabsList>

          {/* Classes tab */}
          <TabsContent value="classes" className="mt-6">
            <div className="flex justify-end mb-3">
              <Button onClick={() => { setClassForm(emptyClass); setClassDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> New class
              </Button>
            </div>
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
                        <td className="px-4 py-3 whitespace-nowrap">{format(new Date(c.starts_at), "EEE MMM d, HH:mm")}</td>
                        <td className="px-4 py-3">{c.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.instructor}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.level}</Badge></td>
                        <td className="px-4 py-3">
                          <span className={cn("font-mono text-xs", full && "text-destructive")}>
                            {booked} / {c.spots_total}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setClassForm({ ...c, starts_at: format(new Date(c.starts_at), "yyyy-MM-dd'T'HH:mm") });
                            setClassDialogOpen(true);
                          }}>
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
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No upcoming classes. Create one to get started.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Bookings by day */}
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
                        <span className="font-mono">{c.bookings.length} / {c.spots_total}</span>
                      </div>
                    </div>
                    {c.bookings.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No bookings yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="text-muted-foreground uppercase tracking-wider">
                          <tr>
                            <th className="text-left py-2">Student</th>
                            <th className="text-left py-2">Tier</th>
                            <th className="text-left py-2">Price</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-left py-2">Booked at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.bookings.map((b) => (
                            <tr key={b.id} className="border-t border-border/30">
                              <td className="py-2">{profiles[b.user_id] ?? b.user_id.slice(0, 8)}</td>
                              <td className="py-2 capitalize">{b.tier}</td>
                              <td className="py-2">${Number(b.price).toFixed(2)}</td>
                              <td className="py-2 capitalize">{b.status}</td>
                              <td className="py-2 text-muted-foreground">{format(new Date(b.created_at), "MMM d, HH:mm")}</td>
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

          {/* Discounts */}
          <TabsContent value="discounts" className="mt-6">
            <div className="flex justify-end mb-3">
              <Button onClick={() => { setDiscountForm(emptyDiscount); setDiscountDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> New code
              </Button>
            </div>
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Code</th>
                    <th className="text-left px-4 py-3">% off</th>
                    <th className="text-left px-4 py-3">Active</th>
                    <th className="text-left px-4 py-3">Window</th>
                    <th className="text-left px-4 py-3">Redemptions</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d) => (
                    <tr key={d.id} className="border-t border-border/50">
                      <td className="px-4 py-3 font-mono">{d.code}</td>
                      <td className="px-4 py-3">{d.percent_off}%</td>
                      <td className="px-4 py-3">{d.is_active ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {d.starts_at ? format(new Date(d.starts_at), "MMM d") : "any"} →{" "}
                        {d.ends_at ? format(new Date(d.ends_at), "MMM d") : "no end"}
                      </td>
                      <td className="px-4 py-3">
                        {d.times_redeemed}{d.max_redemptions ? ` / ${d.max_redemptions}` : ""}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setDiscountForm({
                            id: d.id, code: d.code, percent_off: d.percent_off, is_active: d.is_active,
                            starts_at: d.starts_at ? d.starts_at.slice(0, 16) : "",
                            ends_at: d.ends_at ? d.ends_at.slice(0, 16) : "",
                            max_redemptions: d.max_redemptions ?? "",
                          });
                          setDiscountDialogOpen(true);
                        }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDiscount(d.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {discounts.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No discount codes yet.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Instructors */}
          <TabsContent value="instructors" className="mt-6">
            <div className="flex justify-end mb-3">
              <Button onClick={() => { setInstructorForm(emptyInstructor); setInstructorDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Add instructor
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructors.map((ins) => (
                <div key={ins.id} className="border border-border/50 rounded-lg p-4 flex gap-4">
                  {ins.photo_url ? (
                    <img src={ins.photo_url} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg">{ins.name}</h3>
                      {!ins.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{ins.bio}</p>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setInstructorForm({ id: ins.id, name: ins.name, bio: ins.bio ?? "", photo_url: ins.photo_url ?? "", is_active: ins.is_active });
                        setInstructorDialogOpen(true);
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteInstructor(ins.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {instructors.length === 0 && (
                <p className="text-muted-foreground text-sm col-span-full text-center py-10">
                  No instructors yet. Add one to feature them on your schedule.
                </p>
              )}
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-6 max-w-2xl">
            <div className="space-y-4">
              <div className="grid gap-2"><Label>Studio name</Label>
                <Input value={settingsForm.studio_name} onChange={(e) => setSettingsForm({ ...settingsForm, studio_name: e.target.value })} />
              </div>
              <div className="grid gap-2"><Label>Tagline</Label>
                <Input value={settingsForm.tagline ?? ""} onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Timezone (IANA)</Label>
                  <Input value={settingsForm.timezone} placeholder="America/Los_Angeles" onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })} />
                </div>
                <div className="grid gap-2"><Label>Primary color (hex)</Label>
                  <Input value={settingsForm.primary_color ?? ""} onChange={(e) => setSettingsForm({ ...settingsForm, primary_color: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2"><Label>Contact email</Label>
                <Input type="email" value={settingsForm.contact_email ?? ""} onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })} />
              </div>
              <div className="grid gap-2"><Label>Logo URL</Label>
                <Input value={settingsForm.logo_url ?? ""} placeholder="https://…" onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })} />
              </div>
              <div className="grid gap-2"><Label>Hero image URL</Label>
                <Input value={settingsForm.hero_image_url ?? ""} placeholder="https://…" onChange={(e) => setSettingsForm({ ...settingsForm, hero_image_url: e.target.value })} />
              </div>
              <Button onClick={saveSettings}>Save settings</Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Class dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{classForm.id ? "Edit class" : "New class"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Title</Label>
              <Input value={classForm.title} onChange={(e) => setClassForm({ ...classForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Instructor</Label>
                <Input value={classForm.instructor} onChange={(e) => setClassForm({ ...classForm, instructor: e.target.value })} />
              </div>
              <div className="grid gap-2"><Label>Level</Label>
                <Select value={classForm.level} onValueChange={(v) => setClassForm({ ...classForm, level: v as ClassLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2"><Label>Description</Label>
              <Textarea rows={3} value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Starts</Label>
                <Input type="datetime-local" value={classForm.starts_at} onChange={(e) => setClassForm({ ...classForm, starts_at: e.target.value })} />
              </div>
              <div className="grid gap-2"><Label>Duration (min)</Label>
                <Input type="number" value={classForm.duration_minutes} onChange={(e) => setClassForm({ ...classForm, duration_minutes: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2"><Label>Capacity</Label>
                <Input type="number" value={classForm.spots_total} onChange={(e) => setClassForm({ ...classForm, spots_total: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Drop-in $</Label>
                <Input type="number" value={classForm.drop_in_price} onChange={(e) => setClassForm({ ...classForm, drop_in_price: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2"><Label>Pass $</Label>
                <Input type="number" value={classForm.pass_price} onChange={(e) => setClassForm({ ...classForm, pass_price: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2"><Label>Member $</Label>
                <Input type="number" value={classForm.subscription_price} onChange={(e) => setClassForm({ ...classForm, subscription_price: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveClass}>{classForm.id ? "Save changes" : "Create class"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{discountForm.id ? "Edit code" : "New discount code"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Code</Label>
              <Input value={discountForm.code} onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })} placeholder="FIRST10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Percent off (1-100)</Label>
                <Input type="number" min={1} max={100} value={discountForm.percent_off} onChange={(e) => setDiscountForm({ ...discountForm, percent_off: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-3">
                <Label className="mb-2">Active</Label>
                <Switch checked={discountForm.is_active} onCheckedChange={(v) => setDiscountForm({ ...discountForm, is_active: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Starts (optional)</Label>
                <Input type="datetime-local" value={discountForm.starts_at} onChange={(e) => setDiscountForm({ ...discountForm, starts_at: e.target.value })} />
              </div>
              <div className="grid gap-2"><Label>Ends (optional)</Label>
                <Input type="datetime-local" value={discountForm.ends_at} onChange={(e) => setDiscountForm({ ...discountForm, ends_at: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2"><Label>Max redemptions (optional)</Label>
              <Input type="number" min={1} value={discountForm.max_redemptions} onChange={(e) => setDiscountForm({ ...discountForm, max_redemptions: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDiscount}>{discountForm.id ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instructor dialog */}
      <Dialog open={instructorDialogOpen} onOpenChange={setInstructorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{instructorForm.id ? "Edit instructor" : "New instructor"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Name</Label>
              <Input value={instructorForm.name} onChange={(e) => setInstructorForm({ ...instructorForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2"><Label>Bio</Label>
              <Textarea rows={3} value={instructorForm.bio} onChange={(e) => setInstructorForm({ ...instructorForm, bio: e.target.value })} />
            </div>
            <div className="grid gap-2"><Label>Photo URL</Label>
              <Input value={instructorForm.photo_url} onChange={(e) => setInstructorForm({ ...instructorForm, photo_url: e.target.value })} placeholder="https://…" />
            </div>
            <div className="flex items-center gap-3">
              <Label>Active</Label>
              <Switch checked={instructorForm.is_active} onCheckedChange={(v) => setInstructorForm({ ...instructorForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstructorDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveInstructor}>{instructorForm.id ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
