import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API (Chrome, Edge, Safari); not in the TypeScript DOM types yet.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type Ctor = new () => SpeechRecognitionLike;

function recognitionCtor(): Ctor | undefined {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Speech-to-text for the message box: calls onText with each finished phrase. */
export function useDictation(onText: (text: string) => void, lang = "en-US") {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const supported = recognitionCtor() !== undefined;

  useEffect(() => () => rec.current?.stop(), []);

  const toggle = useCallback(() => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Recognition = recognitionCtor();
    if (!Recognition) return;
    const r = new Recognition();
    r.lang = lang;
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim());
      }
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone permission was denied." : `Dictation error: ${e.error}`);
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    r.start();
    setListening(true);
  }, [lang, listening, onText]);

  return { supported, listening, error, toggle };
}
