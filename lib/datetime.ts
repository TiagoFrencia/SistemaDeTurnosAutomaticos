export function addMinutes(value: string, minutes: number): string {
  const offset = extractOffset(value);
  const date = new Date(value);
  return formatWithOffset(new Date(date.getTime() + minutes * 60_000), offset);
}

function extractOffset(value: string): string {
  const match = value.match(/([+-]\d{2}:\d{2})$/);
  return match?.[1] ?? "+00:00";
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
