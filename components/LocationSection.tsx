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
          1215 Colusa Ave, Yuba City, CA 95991
        </div>
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
      ) : (
        <div className="self-stretch h-64 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-400">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to show map
        </div>
      )}
    </div>
  );
}
