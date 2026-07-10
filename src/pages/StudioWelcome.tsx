import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Mail, Calendar, Users } from "lucide-react";
import appIcon from "/app-icon-512.png";

export default function StudioWelcome() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
          <img src={appIcon} alt="Studio Roxx" width={32} height={32} className="rounded-md" />
          <span className="font-display tracking-wider">STUDIO ROXX</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-6 py-16 md:py-24 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-8">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl mb-6">You're in.</h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-lg mx-auto">
          Welcome to Studio Roxx. Your 14-day free trial has started. Watch your inbox — we'll send your workspace login within one business day.
        </p>

        <div className="grid gap-4 text-left mb-12">
          <Card className="p-6 bg-card/60 border-border/60 flex items-start gap-4">
            <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-display mb-1">Check your email</div>
              <p className="text-sm text-muted-foreground">We'll send onboarding steps and your studio workspace link shortly.</p>
            </div>
          </Card>
          <Card className="p-6 bg-card/60 border-border/60 flex items-start gap-4">
            <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-display mb-1">Plan your first week</div>
              <p className="text-sm text-muted-foreground">Sketch out class titles, instructors, and times — you'll add them in your dashboard.</p>
            </div>
          </Card>
          <Card className="p-6 bg-card/60 border-border/60 flex items-start gap-4">
            <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-display mb-1">Preview the student experience</div>
              <p className="text-sm text-muted-foreground">Take a spin through the booking app your members will see.</p>
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button size="lg" className="font-body">Preview member app</Button>
          </Link>
          <Link to="/for-studios">
            <Button size="lg" variant="outline" className="font-body">Back to home</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
