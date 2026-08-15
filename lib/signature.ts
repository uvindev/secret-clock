/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
const CHIP =
  "background:#F7931A;color:#0A0A0A;font-weight:bold;padding:4px 8px;border-radius:3px;";
let fired = false;
export function signature(project?: string): void {
  if (
    fired ||
    typeof window === "undefined" ||
    process.env.NODE_ENV !== "production"
  )
    return;
  fired = true;
  console.log(
    `%c IAMUVIN ${project ? `· ${project} ` : ""}`,
    CHIP,
    "\nBuilt by Uvin Vindula — iamuvin.com",
  );
}
