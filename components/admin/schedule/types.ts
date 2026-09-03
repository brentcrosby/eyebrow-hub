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
  service: {
    id: number;
    name: string;
    price: string;
    durationMinutes: number;
    active: boolean;
  };
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
