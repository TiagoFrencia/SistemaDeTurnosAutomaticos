const ARGENTINA_OFFSET = "-03:00";
const PUBLIC_AVAILABILITY_DAYS = 30;

export function buildSevenDayAvailabilityWindow(now = new Date()): { from: string; to: string } {
  return buildAvailabilityWindow(7, now);
}

export function buildPublicAvailabilityWindow(now = new Date()): { from: string; to: string } {
  return buildAvailabilityWindow(PUBLIC_AVAILABILITY_DAYS, now);
}

function buildAvailabilityWindow(days: number, now = new Date()): { from: string; to: string } {
  const start = startOfDayInOffset(now, ARGENTINA_OFFSET);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    from: formatWithOffset(start, ARGENTINA_OFFSET),
    to: formatWithOffset(end, ARGENTINA_OFFSET)
  };
}

function startOfDayInOffset(date: Date, offset: string): Date {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  const offsetMinutes = sign * (hours * 60 + minutes);
  const local = new Date(date.getTime() + offsetMinutes * 60_000);

  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      offsetMinutes * 60_000
  );
}

function formatWithOffset(date: Date, offset: string): string {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  const local = new Date(date.getTime() + sign * (hours * 60 + minutes) * 60_000);

  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(
    local.getUTCDate()
  ).padStart(2, "0")}T${String(local.getUTCHours()).padStart(2, "0")}:${String(
    local.getUTCMinutes()
  ).padStart(2, "0")}:${String(local.getUTCSeconds()).padStart(2, "0")}.000${offset}`;
}
