import Image from "next/image";

/**
 * The auth screens' left panel artwork — Figma frame 17:18275 (inside
 * "Frame 1" of Sign Up 11:16810, Sign in 45:111 and OTP 127:21283).
 *
 * Figma draws this on a 560x618 stage. Every coordinate below is that stage
 * expressed as a percentage, so the whole composition scales with whatever
 * width the panel gets on the actual device instead of being pinned to 560px.
 *
 * Both rings share the centre (280, 309); outer r=262, inner r=150.
 */
const STAGE_W = 560;
const STAGE_H = 618;

const pctX = (px: number) => `${(px / STAGE_W) * 100}%`;
const pctY = (px: number) => `${(px / STAGE_H) * 100}%`;

/** Outer ring — 94px frames sitting on the 524px circle. */
const OUTER = [
  { src: "/images/orbit/a1.png", x: 233, y: 0, bg: "bg-primary-50" },
  { src: "/images/orbit/a2.png", x: 233, y: 524, bg: "bg-ivory-50" },
  { src: "/images/orbit/a3.png", x: 466, y: 147, bg: "bg-ivory-50" },
  { src: "/images/orbit/a4.png", x: 0, y: 147, bg: "bg-ivory-50" },
  { src: "/images/orbit/a5.png", x: 466, y: 399, bg: "bg-ivory-50" },
  { src: "/images/orbit/a6.png", x: 0, y: 399, bg: "bg-ivory-50" },
];

/** Inner ring — mixed 106.33 and 80px frames on the 300px circle. */
const INNER = [
  { src: "/images/orbit/b1.png", x: 199, y: 113, size: 106.33 },
  { src: "/images/orbit/b2.png", x: 94, y: 272, size: 80 },
  { src: "/images/orbit/b3.png", x: 227, y: 393, size: 106.33 },
  { src: "/images/orbit/b4.png", x: 378, y: 272, size: 80 },
];

export function AuthOrbit() {
  return (
    <div className="relative aspect-[560/618] w-full max-w-[560px]">
      <svg
        viewBox="0 0 560 618"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          {/* Figma: linear-gradient(215deg, rgba(253,239,229,.8) 5%, #F8741E 100%) */}
          <linearGradient
            id="grouv-ring"
            gradientUnits="objectBoundingBox"
            x1="0.82"
            y1="0.06"
            x2="0.18"
            y2="0.94"
          >
            <stop offset="0.05" stopColor="#FDEFE5" stopOpacity="0.8" />
            <stop offset="1" stopColor="#F8741E" />
          </linearGradient>
        </defs>

        <circle
          cx="280"
          cy="309"
          r="262"
          fill="none"
          stroke="url(#grouv-ring)"
          strokeWidth="2"
          strokeDasharray="20 20"
        />
        <circle
          cx="280"
          cy="309"
          r="150"
          fill="none"
          stroke="url(#grouv-ring)"
          strokeWidth="2"
          strokeDasharray="16 16"
        />
      </svg>

      {OUTER.map((item) => (
        <span
          key={item.src}
          className={`absolute aspect-square overflow-hidden rounded-pill ${item.bg}`}
          style={{ left: pctX(item.x), top: pctY(item.y), width: pctX(94) }}
        >
          <Image
            src={item.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 12vw, 94px"
            className="object-cover"
          />
        </span>
      ))}

      {INNER.map((item) => (
        <span
          key={item.src}
          className="absolute aspect-square overflow-hidden rounded-pill bg-ivory-50"
          style={{
            left: pctX(item.x),
            top: pctY(item.y),
            width: pctX(item.size),
          }}
        >
          <Image
            src={item.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 12vw, 107px"
            className="object-cover"
          />
        </span>
      ))}

      {/* Centre mark — Figma "2 2", 140x140 at (206, 236). */}
      <span
        className="absolute aspect-square"
        style={{ left: pctX(206), top: pctY(236), width: pctX(140) }}
      >
        <Image
          src="/images/orbit/center-aa4ed3.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 15vw, 140px"
          className="object-contain"
        />
      </span>
    </div>
  );
}
