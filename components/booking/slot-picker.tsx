import React, { useEffect, useMemo, useState } from "react";
import type { TimeRange } from "@/lib/domain/types";

export function SlotPicker({
  isRefreshing,
  onSelectSlot,
  selectedSlot,
  slots
}: {
  isRefreshing: boolean;
  onSelectSlot: (slot: string) => void;
  selectedSlot: string;
  slots: TimeRange[];
}) {
  const groups = useMemo(() => groupSlotsByDay(slots), [slots]);
  const groupsByDay = useMemo(() => new Map(groups.map((group) => [group.dayKey, group])), [groups]);
  const availableMonths = useMemo(() => uniqueMonths(groups.map((group) => group.dayKey)), [groups]);
  const [selectedDay, setSelectedDay] = useState(groups[0]?.dayKey ?? "");
  const [visibleMonth, setVisibleMonth] = useState(monthKey(groups[0]?.dayKey ?? ""));
  const visibleGroup = groups.find((group) => group.dayKey === selectedDay) ?? groups[0];
  const visibleMonthIndex = Math.max(0, availableMonths.indexOf(visibleMonth));
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!groups.some((group) => group.dayKey === selectedDay)) {
      const nextDay = groups[0]?.dayKey ?? "";
      setSelectedDay(nextDay);
      setVisibleMonth(monthKey(nextDay));
      return;
    }

    if (!availableMonths.includes(visibleMonth)) {
      setVisibleMonth(monthKey(selectedDay));
    }
  }, [availableMonths, groups, selectedDay, visibleMonth]);

  return (
    <section className="booking-section" aria-labelledby="slot-section-title">
      <div className="section-label">
        <span className="section-number">03</span>
        <h3 id="slot-section-title">Horarios disponibles</h3>
      </div>

      <div className="slot-days" aria-busy={isRefreshing} aria-label="Selector de horarios disponibles">
        {groups.length > 0 ? (
          <>
            <div className="slot-calendar">
              <p className="slot-helper">Elegí un día</p>
              <div className="slot-selected-day">
                <span>{visibleGroup ? formatSelectedDay(visibleGroup.dayKey) : "Sin día seleccionado"}</span>
              </div>

              <div className="slot-calendar-card">
                <div className="slot-calendar-header">
                  <button
                    aria-label="Mes anterior"
                    className="slot-month-button"
                    disabled={isRefreshing || visibleMonthIndex <= 0}
                    onClick={() => setVisibleMonth(availableMonths[visibleMonthIndex - 1] ?? visibleMonth)}
                    type="button"
                  >
                    ‹
                  </button>
                  <h4>{formatMonthTitle(visibleMonth)}</h4>
                  <button
                    aria-label="Mes siguiente"
                    className="slot-month-button"
                    disabled={isRefreshing || visibleMonthIndex >= availableMonths.length - 1}
                    onClick={() => setVisibleMonth(availableMonths[visibleMonthIndex + 1] ?? visibleMonth)}
                    type="button"
                  >
                    ›
                  </button>
                </div>

                <div className="slot-weekdays" aria-hidden="true">
                  {["LU", "MA", "MI", "JU", "VI", "SA", "DO"].map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                  ))}
                </div>

                <div className="slot-calendar-grid" aria-label="Días disponibles">
                  {calendarCells.map((cell) => {
                    const group = groupsByDay.get(cell.dayKey);
                    const isAvailable = Boolean(group);
                    const isSelected = visibleGroup?.dayKey === cell.dayKey;

                    return (
                      <button
                        aria-label={calendarDayLabel(cell.dayKey, group?.slots.length ?? 0)}
                        aria-pressed={isSelected}
                        className="slot-calendar-day"
                        data-outside-month={cell.isCurrentMonth ? undefined : "true"}
                        data-selected={isSelected ? "true" : undefined}
                        disabled={isRefreshing || !isAvailable}
                        key={cell.dayKey}
                        onClick={() => {
                          if (!group) return;
                          setSelectedDay(group.dayKey);
                          onSelectSlot(group.slots[0]?.startAt ?? "");
                        }}
                        type="button"
                      >
                        <span>{cell.dayNumber}</span>
                        {isAvailable ? <small>{group?.slots.length}</small> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="slot-day" key={visibleGroup?.dayKey}>
              <div>
                <p className="slot-helper">Elegí un horario</p>
                <h4>{visibleGroup?.label}</h4>
              </div>
              <div className="slot-grid">
                {visibleGroup?.slots.map((slot) => (
                  <button
                    aria-pressed={selectedSlot === slot.startAt}
                    className="slot-button"
                    data-selected={selectedSlot === slot.startAt ? "true" : undefined}
                    disabled={isRefreshing}
                    key={slot.startAt}
                    onClick={() => onSelectSlot(slot.startAt)}
                    type="button"
                  >
                    <span>{formatSlotCompact(slot.startAt)}</span>
                    <strong>{formatSlotTime(slot.startAt)}</strong>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="empty-state">No hay horarios disponibles para esta selección.</p>
        )}
      </div>
    </section>
  );
}

function groupSlotsByDay(slots: TimeRange[]) {
  const groups = new Map<string, { dayKey: string; label: string; slots: TimeRange[] }>();

  for (const slot of slots) {
    const dayKey = slot.startAt.slice(0, 10);
    const existing = groups.get(dayKey);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }

    groups.set(dayKey, {
      dayKey,
      label: formatDayLabel(slot.startAt),
      slots: [slot]
    });
  }

  return Array.from(groups.values());
}

function uniqueMonths(dayKeys: string[]): string[] {
  return Array.from(new Set(dayKeys.map(monthKey).filter(Boolean)));
}

function monthKey(dayKey: string): string {
  return dayKey ? dayKey.slice(0, 7) : "";
}

function buildCalendarCells(visibleMonth: string) {
  if (!visibleMonth) {
    return [];
  }

  const [year, month] = visibleMonth.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const leadingDays = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month - 1, 1 - leadingDays));
  const daysInGrid = 42;

  return Array.from({ length: daysInGrid }, (_, index) => {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const dayKey = formatDateKey(date);
    return {
      dayKey,
      dayNumber: String(date.getUTCDate()),
      isCurrentMonth: date.getUTCMonth() === month - 1
    };
  });
}

function formatDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function dateFromDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatMonthTitle(month: string): string {
  if (!month) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(dateFromDayKey(`${month}-01`));
}

function formatSelectedDay(dayKey: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(dateFromDayKey(dayKey));
}

function calendarDayLabel(dayKey: string, slotCount: number): string {
  const dateLabel = formatSelectedDay(dayKey);
  if (slotCount === 0) {
    return `${dateLabel}, sin turnos`;
  }

  return `${dateLabel}, ${slotCount} ${slotCount === 1 ? "turno" : "turnos"}`;
}

function formatDayLabel(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date(value));
}

function formatSlotCompact(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit"
  })
    .format(new Date(value))
    .replace(".", "");
}

function formatSlotTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatDayName(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short"
  })
    .format(new Date(value))
    .replace(".", "");
}

function formatDayNumber(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short"
  })
    .format(new Date(value))
    .replace(".", "");
}
