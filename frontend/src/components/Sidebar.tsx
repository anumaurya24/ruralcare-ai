export type Page = "dashboard" | "encounters" | "messages" | "analytics" | "settings";

const ITEMS: Array<{ page: Page; label: string; icon: string }> = [
  { page: "dashboard", label: "Dashboard", icon: "M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z" },
  { page: "encounters", label: "Encounters", icon: "M4 6h16M4 12h16M4 18h10" },
  { page: "messages", label: "Messages", icon: "M4 5h16v11H8l-4 4z" },
  { page: "analytics", label: "Analytics", icon: "M5 20V10m7 10V4m7 16v-7" },
  { page: "settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-3 2-1-2-4-2 1-2-2V4h-4v2L9 8 7 7 5 11l2 1v2l-2 1 2 4 2-1 2 2v2h4v-2l2-2 2 1 2-4-2-1z" },
];

export function Logo() {
  return (
    <div className="logo">
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="7" fill="#0F766E" />
        <path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>RuralCare AI</span>
    </div>
  );
}

export function Sidebar({ page, onNavigate, openEmergencies }: {
  page: Page;
  onNavigate: (p: Page) => void;
  openEmergencies: number;
}) {
  return (
    <nav className="sidebar" aria-label="Main">
      <Logo />
      {ITEMS.map((it) => (
        <button key={it.page} type="button" className="nav-item" aria-current={page === it.page ? "page" : undefined}
          onClick={() => onNavigate(it.page)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon} /></svg>
          {it.label}
          {it.page === "encounters" && openEmergencies > 0 && (
            <span className="nav-count" aria-label={`${openEmergencies} open emergencies`}>{openEmergencies}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
