import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/Footer";
import BusinessHours from "@/components/BusinessHours";
import ServicesSection from "@/components/ServicesSection";
import ImageCarousel from "@/components/ImageCarousel";
import LocationSection from "@/components/LocationSection";
import BookingContainer from "@/components/BookingContainer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section
        className="flex w-full justify-center items-center pt-8 px-6 max-[879px]:pt-6 max-[879px]:px-5"
        aria-label="Hero section"
      >
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <p className="text-[14px] leading-[17px] text-center text-black/75">
              Facial and Eyebrow Threading
            </p>
            <h1 className="w-[519px] font-sans text-[40px] leading-[48px] font-normal text-center text-black flex-none flex-grow-0 max-[879px]:w-full">
              Detail makes the difference
            </h1>
          </div>
          <a
            className="flex items-center justify-center w-[108px] h-10 px-5 rounded-[48px] bg-primary text-white text-p font-medium whitespace-nowrap"
            href="#booking"
          >
            Book Now
          </a>
        </div>
      </section>

      <section className="flex justify-center w-full px-6 pb-12 pt-8 max-[879px]:px-5">
        <ImageCarousel />
      </section>

      <section
        className="w-full max-w-[800px] mx-auto px-6 pb-[120px] max-[879px]:px-5 max-[879px]:pb-24"
        aria-label="Business details layout"
      >
        <div className="grid grid-cols-[minmax(0,368px)_minmax(0,368px)] justify-between items-start gap-x-16 max-[879px]:grid-cols-[minmax(0,1fr)] max-[879px]:gap-y-14">
          
          <div className="w-full max-w-[368px] flex flex-col gap-14 max-[879px]:max-w-full">
            <BusinessHours />
            <ServicesSection />

            <section id="location" className="w-full">
              <LocationSection />
            </section>

            <section id="about" className="w-full">
              <h2 className="text-subtitle leading-none font-normal">About</h2>

              <p className="mt-3 text-[13px] leading-6 text-[#8e8a86]">
                We specialize in facial and eyebrow threading with a focus on precision
                and care. Every service is designed to enhance your natural features
                while providing a clean and comfortable experience.
              </p>
            </section>
          </div>

          <aside className="w-full max-w-[368px] max-[879px]:max-w-full sticky top-12 self-start">
            <section id="booking" className="w-full">
              <BookingContainer />
            </section>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}