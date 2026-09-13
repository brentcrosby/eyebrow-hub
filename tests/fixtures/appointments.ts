// Shared test fixtures for appointments, services, and users

export const mockService = {
  id: 1,
  name: "Eyebrow Threading",
  price: 1500,
  durationMinutes: 30,
  enabled: true,
};

export const mockService2 = {
  id: 2,
  name: "Full Face Threading",
  price: 3000,
  durationMinutes: 45,
  enabled: true,
};

export const mockStylist = {
  id: 1,
  name: "Priya",
  phone: "555-0100",
  enabled: true,
};

export const mockStylist2 = {
  id: 2,
  name: "Anjali",
  phone: "555-0101",
  enabled: true,
};

export const mockBusinessHours = [
  // Sunday: 11 AM - 6 PM (660-1080 minutes)
  {
    dayOfWeek: 0,
    enabled: true,
    openMinutes: 660,
    closeMinutes: 1080,
  },
  // Monday - Saturday: 10 AM - 8 PM (600-1200 minutes)
  ...Array.from({ length: 6 }, (_, i) => ({
    dayOfWeek: i + 1,
    enabled: true,
    openMinutes: 600,
    closeMinutes: 1200,
  })),
];

export const mockSchedulingRule = {
  id: 1,
  minimumNoticeMinutes: 120, // 2 hours
  maximumAdvanceDays: 30,
  bufferMinutes: 15,
};

export const mockBookingRequest = {
  serviceIds: [1],
  stylistId: 1,
  date: "2025-03-15",
  time: "2:00 PM",
  name: "John Doe",
  email: "john@example.com",
  phone: "5550123456",
};

export const mockAppointment = {
  id: 1,
  serviceIds: [1],
  stylistId: 1,
  startTime: new Date("2025-03-15T14:00:00Z"),
  endTime: new Date("2025-03-15T14:30:00Z"),
  customerName: "Jane Smith",
  customerEmail: "jane@example.com",
  customerPhone: "5550987654",
  status: "APPROVED",
  notes: "Test appointment",
};

export const mockAvailabilityBlock = {
  id: 1,
  startTime: new Date("2025-03-15T12:00:00Z"),
  endTime: new Date("2025-03-15T13:00:00Z"),
  reason: "Lunch break",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function createMockDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function createMockAppointmentAt(
  year: number,
  month: number,
  day: number,
  startHour: number,
  durationMinutes: number
) {
  const startTime = new Date(year, month - 1, day, startHour, 0, 0, 0);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  return {
    ...mockAppointment,
    startTime,
    endTime,
  };
}

export function createMockBlockAt(
  year: number,
  month: number,
  day: number,
  startHour: number,
  durationMinutes: number
) {
  const startTime = new Date(year, month - 1, day, startHour, 0, 0, 0);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  return {
    ...mockAvailabilityBlock,
    startTime,
    endTime,
  };
}
