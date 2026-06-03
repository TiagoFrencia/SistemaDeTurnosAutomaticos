import type { AppointmentRange, TimeRange } from "@/lib/domain/types";

type BusinessHour = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type AvailabilityInput = {
  serviceDurationMinutes: number;
  windowStart: string;
  windowEnd: string;
  businessHours: BusinessHour[];
  appointments: AppointmentRange[];
  blocks: Array<TimeRange & { professionalId?: string | null }>;
  professionalId: string;
};

const BLOCKING_STATUSES = new Set(["pending_payment", "confirmed"]);

export function getAvailableSlots(input: AvailabilityInput): TimeRange[] {
  const windowStart = new Date(input.windowStart);
  const windowEnd = new Date(input.windowEnd);
  const offset = extractOffset(input.windowStart);
  const slots: TimeRange[] = [];

  for (
    let cursor = new Date(windowStart);
    cursor.getTime() + input.serviceDurationMinutes * 60_000 <= windowEnd.getTime();
    cursor = new Date(cursor.getTime() + input.serviceDurationMinutes * 60_000)
  ) {
    const slotEnd = new Date(cursor.getTime() + input.serviceDurationMinutes * 60_000);

    if (
      isInsideBusinessHours(cursor, slotEnd, input.businessHours, offset) &&
      !hasOverlap(cursor, slotEnd, blockingAppointments(input.appointments, input.professionalId)) &&
      !hasOverlap(cursor, slotEnd, matchingBlocks(input.blocks, input.professionalId))
    ) {
      slots.push({
        startAt: formatWithOffset(cursor, offset),
        endAt: formatWithOffset(slotEnd, offset)
      });
    }
  }

  return slots;
}

function blockingAppointments(appointments: AppointmentRange[], professionalId: string): TimeRange[] {
  return appointments.filter(
    (appointment) =>
      appointment.professionalId === professionalId && BLOCKING_STATUSES.has(appointment.status)
  );
}

function matchingBlocks(
  blocks: Array<TimeRange & { professionalId?: string | null }>,
  professionalId: string
): TimeRange[] {
  return blocks.filter((block) => !block.professionalId || block.professionalId === professionalId);
}

function hasOverlap(start: Date, end: Date, ranges: TimeRange[]): boolean {
  return ranges.some((range) => {
    const rangeStart = new Date(range.startAt);
    const rangeEnd = new Date(range.endAt);
    return start < rangeEnd && end > rangeStart;
  });
}

function isInsideBusinessHours(
  start: Date,
  end: Date,
  businessHours: BusinessHour[],
  offset: string
): boolean {
  const localStart = toOffsetDateParts(start, offset);
  const localEnd = toOffsetDateParts(end, offset);

  return businessHours.some((hour) => {
    if (hour.dayOfWeek !== localStart.dayOfWeek || hour.dayOfWeek !== localEnd.dayOfWeek) {
      return false;
    }

    return localStart.time >= hour.startTime && localEnd.time <= hour.endTime;
  });
}

function extractOffset(value: string): string {
  const match = value.match(/([+-]\d{2}:\d{2})$/);
  return match?.[1] ?? "+00:00";
}

function toOffsetDateParts(date: Date, offset: string): { dayOfWeek: number; time: string } {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  const local = new Date(date.getTime() + sign * (hours * 60 + minutes) * 60_000);
  const dayOfWeek = local.getUTCDay();
  const time = `${String(local.getUTCHours()).padStart(2, "0")}:${String(
    local.getUTCMinutes()
  ).padStart(2, "0")}`;

  return { dayOfWeek, time };
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
