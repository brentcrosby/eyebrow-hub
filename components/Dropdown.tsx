"use client";

import { useRef, useState, useEffect } from "react";

function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
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
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
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

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectDropdown({ label, placeholder, options, selected, onChange }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false));

  function toggle(option: string) {
    onChange(
      selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]
    );
  }

  const triggerLabel = selected.length > 0 ? selected.join(", ") : null;

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={ref}>
      <label className="text-[14px] leading-[17px] font-medium text-black">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        <span className={`text-[14px] leading-[17px] text-left truncate pr-2 ${triggerLabel ? "text-black" : "text-black/50"}`}>
          {triggerLabel ?? placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 flex flex-col bg-white rounded-lg z-10" style={dropdownPanelStyle}>
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className="flex flex-row items-center gap-3 px-4 py-3 w-full text-left"
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
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-[14px] leading-[17px] text-black">{option}</span>
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

export function SingleSelectDropdown({ label, options, value, onChange }: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={ref}>
      <label className="text-[14px] leading-[17px] font-medium text-black">{label}</label>
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
        <div className="absolute left-0 right-0 top-full mt-1 flex flex-col bg-white rounded-lg z-10" style={dropdownPanelStyle}>
          {options.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                onClick={() => { onChange(option); setOpen(false); }}
                className="flex flex-row items-center gap-3 px-4 py-3 w-full text-left"
              >
                <span className="w-4 flex items-center justify-center flex-shrink-0">
                  {selected && <img src="/assets/check.svg" alt="" width={11} height={8} />}
                </span>
                <span className={`text-[14px] leading-[17px] ${selected ? "text-black" : "text-black/60"}`}>
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
