declare global {
  interface Window {
    plausible?: (event: string) => void;
  }
}
export type ProductEvent =
  | "workbench_viewed"
  | "metadata_audited"
  | "rotation_queue_exported"
  | "pricing_intent"
  | "feedback_intent";
export function trackEvent(event: ProductEvent): void {
  if (typeof window !== "undefined") window.plausible?.(event);
}
