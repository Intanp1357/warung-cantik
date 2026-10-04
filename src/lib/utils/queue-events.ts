/**
 * Fired in the browser whenever queue data changed (checkout, done, cancel…).
 * Listening components can refresh right away instead of waiting for the
 * next poll / realtime event.
 */
export const QUEUE_CHANGED_EVENT = "warung:queue-changed";

export function notifyQueueChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}
