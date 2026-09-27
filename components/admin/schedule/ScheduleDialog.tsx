"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ScheduleDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function ScheduleDialog({
  open,
  title,
  onClose,
  children,
}: ScheduleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-0 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/30 sm:m-auto sm:max-w-xl sm:rounded-2xl"
    >
      <div onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-4 border-b border-[#eadfce] bg-[#fffaf4] px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-[#5e3d1e]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#d8c4ae] px-3 py-1.5 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none"
          >
            Close
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
