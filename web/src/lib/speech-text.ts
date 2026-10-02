import type { PublicRecord } from "./tag-repository";

export function formatExpiryMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildSpokenText(record: PublicRecord, expired: boolean): string {
  const warning = expired
    ? "Warning. The labelled expiry has passed. Verify this medicine with a pharmacist. "
    : "";
  return (
    warning +
    "MEDOT. Medicine identified. " +
    record.genericName + ". " +
    record.strength + ". " +
    record.dosageForm + ". " +
    "Batch " + record.batchNumber + ". " +
    "Recorded instruction: " + record.instruction + ". " +
    "Labelled expiry: " + formatExpiryMonth(record.expiryMonth) + "."
  );
}
