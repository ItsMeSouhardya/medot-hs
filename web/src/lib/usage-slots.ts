export const usageSlots = ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "AS_NEEDED"] as const;
export type UsageSlot = typeof usageSlots[number];
