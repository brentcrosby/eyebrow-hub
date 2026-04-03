import Image from "next/image";

export function Navbar() {
  return (
    <nav className="w-full bg-white h-[72px] max-[639px]:h-auto" aria-label="Primary">
      <div className="flex items-center justify-between w-full max-w-[1120px] h-[72px] mx-auto px-40 max-[879px]:px-5 max-[639px]:h-auto max-[639px]:flex-col max-[639px]:justify-center max-[639px]:gap-[14px] max-[639px]:py-3">
        <a className="text-p text-black font-medium" href="#top">
          Eyebrow Hub
        </a>

        <div className="flex items-center gap-8 max-[879px]:gap-[18px] max-[639px]:flex-wrap max-[639px]:justify-center max-[639px]:gap-y-3">
          <a className="text-p text-black" href="#services">
            Services
          </a>
          <a className="text-p text-black" href="#about">
            About
          </a>
          <a className="inline-flex items-center gap-2 text-p text-black font-medium" href="tel:5307515098">
            <Image
              className="w-4 h-4 flex-none object-contain"
              src="/assets/phone-icon-outline.svg"
              alt=""
              width={15}
              height={15}
              aria-hidden="true"
            />
            <span className="underline underline-offset-2">(530)-751-5098</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
