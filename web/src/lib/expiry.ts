// Pure shared calculation; token generation remains server-side in domain.ts.
export function expiryState(month: string, now: Date = new Date()): "CURRENT" | "EXPIRED" {
  const match = /^([0-9]{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new Error("Invalid expiry month");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(parts.find(part => part.type === "year")?.value);
  const currentMonth = Number(parts.find(part => part.type === "month")?.value);
  return year * 12 + currentMonth > Number(match[1]) * 12 + Number(match[2]) ? "EXPIRED" : "CURRENT";
}
