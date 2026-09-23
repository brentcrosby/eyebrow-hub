export type ScheduleAppointment = {
  id: number;
  serviceId: number;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  status: string;
  source?: string | null;
  stylist?: {
    id: number;
    name: string;
  } | null;
  service: {
    id: number;
    name: string;
    price: string;
    durationMinutes: number;
    active: boolean;
  };
};

/** A selectable schedule interval expressed in salon-local time. */
export type ScheduleSlot = {
  start: Date;
  end: Date;
};

export type ScheduleInteractionProps = {
  /** When omitted, the grid does not render selectable empty-slot controls. */
  onSlotClick?: (slot: ScheduleSlot) => void;
  /** When omitted, appointment cards expose no application click action. */
  onAppointmentClick?: (appointment: ScheduleAppointment) => void;
};

export type AvailabilityBlock = {
  id: number;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ScheduleView = "day" | "week";
