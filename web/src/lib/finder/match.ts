import type { FindTarget, MatchVerdict } from "./types";
import type { PublicRecord } from "../tag-repository";
import { expiryState } from "../expiry";
export function matchCandidate(target: FindTarget, record: PublicRecord, now?: Date): MatchVerdict {
  if (target.kind === "slot" && !record.usageSlots?.length) return "TIMING_UNKNOWN";
  const matches = target.kind === "medicine" ? target.medicineId === record.medicineId : record.usageSlots?.includes(target.slot);
  if (!matches) return "NO_MATCH";
  return expiryState(record.expiryMonth, now) === "EXPIRED" ? "MATCH_EXPIRED" : "MATCH";
}
