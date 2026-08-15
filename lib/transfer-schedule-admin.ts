import type { TransferDirection } from "@/lib/types"

/** Hash anchors for schedule direction tabs (EditorWorkspace left rail stays). */
export function scheduleDirectionAnchor(direction: TransferDirection): string {
  return direction === "return" ? "transfer-schedules-return" : "transfer-schedules-outbound"
}

/** Resolve active direction from location.hash (default outbound). */
export function parseScheduleDirectionHash(hash: string): TransferDirection {
  const h = hash.replace(/^#/, "")
  if (h === "transfer-schedules-return") return "return"
  return "outbound"
}
