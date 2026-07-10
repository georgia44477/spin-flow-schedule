import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const StudioHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const links = [
    { to: "/", label: "Schedule" },
    { to: "/memberships", label: "Memberships" },
    ...(user ? [{ to: "/my-bookings", label: "My Bookings" }] : []),
  ];

  return (
    <header className="px-6 py-5 flex items-center justify-between border-b border-border/50">
      <Link to="/" className="block">
        <h1 className="font-display text-2xl tracking-[0.08em] text-foreground">STUDIO ROXX</h1>
        <p className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-0.5">
          Pole · Dance · Strength
        </p>
      </Link>
      <nav className="flex items-center gap-6">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "font-body text-xs tracking-wider uppercase transition-colors",
              location.pathname === link.to
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-border/50">
            <span className="flex items-center gap-2 font-body text-xs text-foreground">
              <UserIcon className="w-3.5 h-3.5 text-primary" />
              {user.email?.split("@")[0]}
            </span>
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="text-muted-foreground hover:text-accent transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="font-body text-xs tracking-wider uppercase px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
};

export default StudioHeader;
