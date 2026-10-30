import { useState } from "react";
import { EncounterFeed } from "./components/EncounterFeed";
import { MessageForm } from "./components/MessageForm";
import type { Triage } from "./types";
import { useEncounterFeed } from "./useEncounterFeed";

export default function App() {
  const { encounters, status, error } = useEncounterFeed();
  const [filter, setFilter] = useState<Triage | "ALL">("ALL");
  const emergencies = encounters.filter((e) => e.triage === "EMERGENCY").length;

  return (
    <main>
      <h1>RuralCare AI</h1>
      <p className="subtitle">SMS health triage: {encounters.length} messages, {emergencies} emergencies</p>
      {error && <p role="alert" className="error">Could not load messages: {error}</p>}
      <div className="grid">
        <MessageForm />
        <EncounterFeed encounters={encounters} status={status} filter={filter} onFilter={setFilter} />
      </div>
    </main>
  );
}
