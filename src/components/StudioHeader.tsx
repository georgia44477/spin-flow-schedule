const StudioHeader = () => {
  return (
    <header className="px-6 py-5 flex items-center justify-between border-b border-border/50">
      <div>
        <h1 className="font-display text-2xl tracking-[0.08em] text-foreground">VERTIGO</h1>
        <p className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-0.5">
          Pole · Dance · Strength
        </p>
      </div>
      <nav className="flex items-center gap-6">
        <span className="font-body text-xs tracking-wider uppercase text-primary cursor-pointer hover:text-foreground transition-colors">
          Schedule
        </span>
        <span className="font-body text-xs tracking-wider uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          Memberships
        </span>
        <span className="font-body text-xs tracking-wider uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          About
        </span>
      </nav>
    </header>
  );
};

export default StudioHeader;
