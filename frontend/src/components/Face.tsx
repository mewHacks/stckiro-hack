import Image from "next/image";

/** profile photo, or the first initial when there isn't one */
export default function Face({ src, name, size = 44 }: { src?: string; name: string; size?: number }) {
  const box = { width: size, height: size };
  return src ? (
    <Image src={src} alt={name} width={size} height={size} style={box} className="shrink-0 rounded-full object-cover ring-2 ring-white" />
  ) : (
    <span style={{ ...box, fontSize: size * 0.42 }} className="grid shrink-0 place-items-center rounded-full bg-sky font-black text-brand-deep ring-2 ring-white">{name[0]}</span>
  );
}
