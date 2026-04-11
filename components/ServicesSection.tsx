const services = [
  { name: "Brow Consult", price: "Free" },
  { name: "Eyebrow", price: "$15" },
  { name: "Eyebrow/Lip", price: "$15" },
  { name: "Chin/Lip", price: "$12" },
  { name: "Cheeks", price: "$7" },
  { name: "Forehead", price: "$7" },
  { name: "Full Face", price: "$30" },
  { name: "Half Face", price: "$25" },
  { name: "Lip", price: "$6" },
  { name: "Unibrow", price: "$5" },
  { name: "Men’s Eyebrow/Cheeks", price: "$17" },
  { name: "Sideburns", price: "$10" },
  { name: "Eyebrows/Forehead", price: "$15" },
  { name: "Eyebrows/Lip/Chin", price: "$22" },
];

export default function ServicesSection() {
  return (
    <section id="services" className="w-full">
      <h2 className="text-subtitle leading-none font-normal">Services</h2>

      <p className="mt-3 max-w-[280px] text-[12px] leading-5 text-[#8e8a86]">
        Select from available services or book a Brow Consult and we will guide
        you.
      </p>

      <div className="mt-5">
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between border-b border-[#e8e3de] pb-2 text-[13px] text-[#1f1f1f]"
            >
              <span>{service.name}</span>
              <span>{service.price}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}