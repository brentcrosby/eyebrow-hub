"use client";

import { useRef, useState, useEffect, useCallback } from "react";

function useDropdownMaxHeight(
  containerRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  minHeight = 160
): number | undefined {
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!open || !containerRef.current) {
      setMaxHeight(undefined);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const available = window.innerHeight - rect.bottom - 8;
    setMaxHeight(available >= minHeight ? available : undefined);
  }, [open, containerRef, minHeight]);
  return maxHeight;
}

function useOutsideClick(
  ref: React.RefObject<HTMLDivElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onClose]);
}

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
      }}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const dropdownPanelStyle = {
  padding: "16px 0",
  border: "1px solid rgba(0,0,0,0.1)",
  boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildCalendarDays(
  year: number,
  month: number
): { date: Date; currentMonth: boolean }[] {
  const first = new Date(year, month, 1);
  // Sunday-anchored: getDay() returns 0=Sun, which is already correct
  const startOffset = first.getDay();
  const days: { date: Date; currentMonth: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), currentMonth: false });
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), currentMonth: false });
  }
  return days;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isSameDay(a: Date, b: Date | null) {
  return (
    b !== null &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DatePickerDropdownProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  unavailableDates?: Set<string>;
}

function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerDropdown({
  label,
  value,
  onChange,
  unavailableDates,
}: DatePickerDropdownProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    value?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    value?.getMonth() ?? today.getMonth()
  );
  const ref = useRef<HTMLDivElement>(null);
  const maxDropdownHeight = useDropdownMaxHeight(ref, open, 280);

  useOutsideClick(ref, () => setOpen(false));

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const days = buildCalendarDays(viewYear, viewMonth);

  const triggerLabel = value
    ? value.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={ref}>
      <label className="text-[14px] leading-[17px] font-medium text-black">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        <span
          className={`text-[14px] leading-[17px] text-left ${triggerLabel ? "text-black" : "text-black/50"}`}
        >
          {triggerLabel ?? "Select a date"}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg z-10 select-none overflow-y-auto"
          style={{
            ...dropdownPanelStyle,
            padding: "16px",
            maxHeight: maxDropdownHeight,
          }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-[14px] font-semibold text-black">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                disabled={isCurrentMonth}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${!isCurrentMonth ? "hover:bg-black/5 cursor-pointer" : "cursor-default"}`}
                style={{ opacity: isCurrentMonth ? 0.25 : 1 }}
              >
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path
                    d="M6 1L1 6L6 11"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer transition-colors"
              >
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path
                    d="M1 1L6 6L1 11"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-[12px] font-medium text-black/40 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7">
            {days.map(({ date, currentMonth }, i) => {
              const selected = isSameDay(date, value);
              const isToday = isSameDay(date, today);
              const todayMidnight = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
              );
              const isPast = date < todayMidnight;
              const isUnavailable =
                unavailableDates?.has(dateKey(date)) ?? false;
              const disabled = isPast || isUnavailable;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!disabled) {
                      onChange(date);
                      setOpen(false);
                    }
                  }}
                  disabled={disabled}
                  className={`flex items-center justify-center aspect-square rounded-full text-[13px] transition-colors ${!disabled && !selected ? "hover:bg-black/10" : ""}`}
                  style={{
                    color: selected
                      ? "white"
                      : disabled || !currentMonth
                        ? "rgba(0,0,0,0.2)"
                        : "black",
                    ...(selected && { backgroundColor: "#6B4F3A" }),
                    fontWeight: isToday && !selected ? 600 : undefined,
                    cursor: disabled ? "default" : "pointer",
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimePickerDropdownProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  slots: TimeSlot[];
  emptyMessage?: string;
}

export function TimePickerDropdown({
  label,
  value,
  onChange,
  slots,
  emptyMessage = "No times available",
}: TimePickerDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={ref}>
      <label className="text-[14px] leading-[17px] font-medium text-black">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        <span
          className={`text-[14px] leading-[17px] text-left ${value ? "text-black" : "text-black/50"}`}
        >
          {value || "Choose a time"}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg z-10 overflow-y-auto"
          style={{ ...dropdownPanelStyle, maxHeight: "280px" }}
        >
          {/* Reset option */}
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex flex-row items-center gap-3 px-4 py-3 w-full text-left cursor-pointer hover:bg-black/5"
          >
            <span className="w-4 flex items-center justify-center flex-shrink-0">
              {!value && (
                <svg width="11" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={`text-[14px] leading-[17px] ${!value ? "text-black" : "text-black/50"}`}
            >
              Choose a time
            </span>
          </button>

          {slots.length === 0 && (
            <div className="px-4 py-3 text-[14px] leading-[17px] text-black/40">
              {emptyMessage}
            </div>
          )}

          {slots.map(({ time, available }) => (
            <button
              key={time}
              type="button"
              disabled={!available}
              onClick={() => {
                if (available) {
                  onChange(time);
                  setOpen(false);
                }
              }}
              className={`flex flex-row items-center justify-between px-4 py-3 w-full text-left ${available ? "cursor-pointer hover:bg-black/5" : "cursor-default"}`}
            >
              <span
                className="text-[14px] leading-[17px]"
                style={{ color: available ? "black" : "rgba(0,0,0,0.3)" }}
              >
                {time}
              </span>
              {!available && (
                <span className="text-[13px] leading-[17px] text-black/30">
                  Unavailable
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selected,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const maxDropdownHeight = useDropdownMaxHeight(ref, open);

  useOutsideClick(ref, () => setOpen(false));

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  }

  const triggerLabel = selected.length > 0 ? selected.join(", ") : null;

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={ref}>
      <label className="text-[14px] leading-[17px] font-medium text-black">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        <span
          className={`text-[14px] leading-[17px] text-left truncate pr-2 ${triggerLabel ? "text-black" : "text-black/50"}`}
        >
          {triggerLabel ?? placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 flex flex-col bg-white rounded-lg z-10 overflow-y-auto"
          style={{ ...dropdownPanelStyle, maxHeight: maxDropdownHeight }}
        >
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className="flex flex-row items-center gap-3 px-4 py-3 w-full text-left cursor-pointer hover:bg-black/5"
              >
                <div
                  className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
                  style={{
                    border: checked ? "none" : "1.5px solid rgba(0,0,0,0.2)",
                    backgroundColor: checked ? "#6B4F3A" : "white",
                  }}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-[14px] leading-[17px] text-black">
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SingleSelectDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
}: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const maxDropdownHeight = useDropdownMaxHeight(ref, open);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={ref}>
      <label className="text-[14px] leading-[17px] font-medium text-black">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        <span className="text-[14px] leading-[17px] text-black">{value}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 flex flex-col bg-white rounded-lg z-10 overflow-y-auto"
          style={{ ...dropdownPanelStyle, maxHeight: maxDropdownHeight }}
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="flex flex-row items-center gap-3 px-4 py-3 w-full text-left cursor-pointer hover:bg-black/5"
              >
                <span className="w-4 flex items-center justify-center flex-shrink-0">
                  {selected && (
                    <img src="/assets/check.svg" alt="" width={11} height={8} />
                  )}
                </span>
                <span
                  className={`text-[14px] leading-[17px] ${selected ? "text-black" : "text-black/60"}`}
                >
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
