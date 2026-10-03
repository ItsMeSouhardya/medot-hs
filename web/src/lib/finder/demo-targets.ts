import { resolveTag } from "../tag-repository";
import type { FindOption } from "./types";
import { buildProvenance } from "../record-provenance";
export async function getDemoFindTargets(configured = process.env.FIND_DEMO_TOKENS, lookup = resolveTag): Promise<FindOption[]> {
  if (!configured || configured.length > 150) return [];
  const tokens = configured.split(",").map(value => value.trim());
  if (tokens.length > 5 || tokens.some(token => !/^[A-Za-z0-9_-]{22}$/.test(token))) return [];
  const options = await Promise.all([...new Set(tokens)].map(async token => {
    try {
      const result = await lookup(token);
      if (result.kind !== "active" || result.record.token !== token) return null;
      const r = result.record;
      if (!r.medicineId?.trim() || r.recordKind !== "FICTIONAL_DEMO" || buildProvenance(r).verification !== "PAIRING_VERIFIED") return null;
      return { medicineId: r.medicineId, genericName: r.genericName, strength: r.strength, dosageForm: r.dosageForm, ...(r.brandName ? { brandName: r.brandName } : {}) };
    } catch { return null; }
  }));
  const unique = new Map<string, FindOption>();
  for (const option of options) if (option) unique.set(option.medicineId, option);
  return [...unique.values()];
}
