import type { UsageSlot } from "../usage-slots";
import { z } from "zod";
export type FindTarget = { kind: "medicine"; medicineId: string } | { kind: "slot"; slot: UsageSlot };
export type FindOption = { medicineId: string; genericName: string; strength: string; dosageForm: string; brandName?: string };
export type MatchVerdict = "MATCH" | "MATCH_EXPIRED" | "NO_MATCH" | "TIMING_UNKNOWN";
const label=z.string().min(1).max(64);
export const findOptionsSchema=z.array(z.object({medicineId:label,genericName:label,strength:label,dosageForm:label,brandName:label.optional()})).max(5);
export function formatFindOption(option:FindOption):string {return [option.brandName,option.genericName,option.strength,option.dosageForm].filter(Boolean).join(" · ");}
