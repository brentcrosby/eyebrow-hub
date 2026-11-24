export default function LocationSection() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const address = "1215 Colusa Ave, Yuba City, CA 95991";
  const encodedAddress = encodeURIComponent(address);

  return (
    <div className="flex flex-col justify-start items-start gap-8 w-full">
      <div className="self-stretch flex flex-col justify-start items-start gap-4">
        <div className="self-stretch text-black text-xl font-normal font-['Inter']">
          Location
        </div>
        <div className="self-stretch text-black/50 text-sm font-normal font-['Inter']">
          {address}
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`}
          className="text-sm text-[#5e3d1e] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get directions on Google Maps
        </a>
      </div>
      {apiKey ? (
        <iframe
          className="self-stretch h-64 rounded-lg border-0"
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Business location map"
        />
      ) : null}
    </div>
  );
}
