import Image from "next/image";

// Navy logo on a white tile so it reads on the blue backgrounds.
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="pill grid shrink-0 place-items-center !rounded-[30%]" style={{ width: size, height: size }}>
      <Image src="/logo.png" alt="Buoyant" width={size} height={size} className="size-[82%]" priority />
    </span>
  );
}
