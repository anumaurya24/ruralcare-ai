/** Minimal stand-in for the browser WebSocket so tests can push server messages. */
export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.onopen?.();
  }

  push(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  drop() {
    this.onclose?.();
  }

  close() {
    this.closed = true;
  }
}
