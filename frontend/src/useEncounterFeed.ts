import { useEffect, useRef, useState } from "react";
import { listEncounters, wsUrl } from "./api";
import type { Encounter } from "./types";

export type FeedStatus = "connecting" | "live" | "offline";

/** Loads recent encounters, then keeps the list live over a WebSocket (reconnects after drops). */
export function useEncounterFeed(retryMs = 3000) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const closed = useRef(false);

  useEffect(() => {
    closed.current = false;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    listEncounters()
      .then(setEncounters)
      .catch((e: Error) => setError(e.message));

    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(wsUrl("/ws/encounters"));
      ws.onopen = () => setStatus("live");
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "encounter") {
          setEncounters((prev) => [msg.data as Encounter, ...prev.filter((e) => e.id !== msg.data.id)]);
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

  return { encounters, status, error };
}
