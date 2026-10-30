import { useCallback, useEffect, useRef, useState } from "react";
import { listEncounters, updateStatus, wsUrl } from "./api";
import type { CaseStatus, Encounter } from "./types";

export type FeedStatus = "connecting" | "live" | "offline";

function upsert(list: Encounter[], e: Encounter): Encounter[] {
  const i = list.findIndex((x) => x.id === e.id);
  if (i === -1) return [e, ...list];
  const next = list.slice();
  next[i] = e;
  return next;
}

/** Loads recent encounters, keeps them live over a WebSocket (reconnects after drops), and updates case status. */
export function useEncounterFeed(retryMs = 3000) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const closed = useRef(false);

  useEffect(() => {
    closed.current = false;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    listEncounters()
      .then((rows) => setEncounters((live) => rows.reduce(upsert, live).sort((a, b) => b.id - a.id)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));

    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(wsUrl("/ws/encounters"));
      ws.onopen = () => setStatus("live");
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "encounter" || msg.type === "update") {
          setEncounters((prev) => upsert(prev, msg.data as Encounter));
        }
      };
      ws.onclose = () => {
        setStatus("offline");
        if (!closed.current) timer = setTimeout(connect, retryMs);
      };
    };
    connect();

    return () => {
      closed.current = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [retryMs]);

  const setCaseStatus = useCallback(async (id: number, next: CaseStatus) => {
    try {
      const updated = await updateStatus(id, next);
      setEncounters((prev) => upsert(prev, updated));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  return { encounters, status, error, loaded, setCaseStatus };
}
