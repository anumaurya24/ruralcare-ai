import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "./components/Analytics";
import { EmergencyAlert } from "./components/EmergencyAlert";
import { EncounterDrawer } from "./components/EncounterDrawer";
import { EncounterQueue } from "./components/EncounterQueue";
import { KpiCards } from "./components/KpiCards";
import { MessageForm } from "./components/MessageForm";
import { Sidebar, type Page } from "./components/Sidebar";
import { useEncounterFeed } from "./useEncounterFeed";

type Theme = "light" | "dark";

const TITLES: Record<Page, [string, string]> = {
  dashboard: ["Dashboard", "Patient triage overview"],
  encounters: ["Encounters", "Every message and its triage decision"],
  messages: ["Messages", "Triage a new patient message"],
  analytics: ["Analytics", "Triage volume and symptoms"],
  settings: ["Settings", "Display preferences"],
};

function savedTheme(): Theme {
  try {
    const t = localStorage.getItem("ruralcare-theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* storage blocked */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Ids that arrived live in the last few seconds, for the arrival highlight. */
function useNewIds(ids: number[], loaded: boolean) {
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const seen = useRef<Set<number> | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    if (!loaded) return;
    if (seen.current === null) {
      seen.current = new Set(ids); // history from the first load is not "new"
      return;
    }
    const added = ids.filter((id) => !seen.current!.has(id));
    if (!added.length) return;
    added.forEach((id) => seen.current!.add(id));
    setFresh((f) => new Set([...f, ...added]));
    setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !added.includes(id)))), 2000);
  }, [key, loaded]); // `key` stands in for `ids`, which is a new array on every render
  return fresh;
}

export default function App() {
  const { encounters, status, error, loaded, setCaseStatus } = useEncounterFeed();
  const [page, setPage] = useState<Page>("dashboard");
  const [selected, setSelected] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const newIds = useNewIds(encounters.map((e) => e.id), loaded);
  const openEmergencies = encounters.filter((e) => e.triage === "EMERGENCY" && e.status === "open");
  const current = encounters.find((e) => e.id === selected) ?? null;
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("ruralcare-theme", theme);
    } catch {
      /* storage blocked */
    }
  }, [theme]);

  useEffect(() => {
    document.title = openEmergencies.length ? `(${openEmergencies.length}) RuralCare AI` : "RuralCare AI Dashboard";
  }, [openEmergencies.length]);

  const [title, subtitle] = TITLES[page];
  return (
    <div className="shell">
      <Sidebar page={page} onNavigate={setPage} openEmergencies={openEmergencies.length} />
      <main className="content">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="top-actions">
            <span className={`conn conn-${status}`} role="status">{status}</span>
            {page !== "messages" && (
              <button type="button" className="btn btn-primary" onClick={() => setPage("messages")}>New message</button>
            )}
            <span className="avatar" title="Clinic staff" aria-label="Signed in as clinic staff">CS</span>
          </div>
        </header>

        {error && <p role="alert" className="error">Could not load messages: {error}</p>}

        {page === "dashboard" && (
          <>
            <KpiCards encounters={encounters} />
            <EmergencyAlert open={openEmergencies} onView={setSelected}
              onAcknowledge={(id) => setCaseStatus(id, "acknowledged")} />
            <EncounterQueue encounters={encounters} onSelect={setSelected} newIds={newIds} title="Recent encounters" limit={10} />
          </>
        )}
        {page === "encounters" && <EncounterQueue encounters={encounters} onSelect={setSelected} newIds={newIds} title="All encounters" />}
        {page === "messages" && <MessageForm />}
        {page === "analytics" && <Analytics encounters={encounters} />}
        {page === "settings" && (
          <section className="card">
            <div className="settings-row">
              <div>
                <div className="patient">Dark mode</div>
                <div className="muted">Easier on the eyes for night shifts.</div>
              </div>
              <label className="check">
                <input type="checkbox" checked={theme === "dark"} onChange={(e) => setTheme(e.target.checked ? "dark" : "light")} />
                Dark mode
              </label>
            </div>
          </section>
        )}
      </main>
      {current && <EncounterDrawer encounter={current} all={encounters} onClose={close} onStatus={setCaseStatus} />}
    </div>
  );
}
