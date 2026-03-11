import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const StudioHeader = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Schedule" },
    { to: "/memberships", label: "Memberships" },
  ];

  return (
    <header className="px-6 py-5 flex items-center justify-between border-b border-border/50">
      <Link to="/" className="block">
        <h1 className="font-display text-2xl tracking-[0.08em] text-foreground">VERTIGO</h1>
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
      </nav>
    </header>
  );
};

export default StudioHeader;
