export default function BookingContainer() {
  return (
    <div
      className="flex flex-col items-start gap-8 p-8 bg-white rounded-[15px] w-full"
      style={{ border: "1px solid rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 w-full">
        <h2 className="text-[20px] leading-6 font-normal text-black">Book Online</h2>
        <p className="text-[14px] leading-[17px] text-black/50">
          Select a service, stylist, and preferred time.
        </p>
      </div>

      {/* Service */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[14px] leading-[17px] font-medium text-black">Service</label>
        <div
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className="text-[14px] leading-[17px] text-black/50">Select Service(s)</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Stylist */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[14px] leading-[17px] font-medium text-black">Stylist</label>
        <div
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className="text-[14px] leading-[17px] text-black">Next Available</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[14px] leading-[17px] font-medium text-black">Date</label>
        <div
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className="text-[14px] leading-[17px] text-black">02/25/2026</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Time */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[14px] leading-[17px] font-medium text-black">Time</label>
        <div
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className="text-[14px] leading-[17px] text-black/50">Choose a time</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Continue Button */}
      <button
        disabled
        className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white cursor-not-allowed"
        style={{ backgroundColor: "#6B4F3A", opacity: 0.25 }}
      >
        Continue
      </button>
    </div>
  );
}
