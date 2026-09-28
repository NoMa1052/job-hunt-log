import { useLayoutEffect, useId, useRef } from "react";

// Sidekick logo mark with the light-trace animation.
// Static by default. Pass `animate` to play the trace once on mount.
// Timing: badge in 300ms, light on 250ms, trace 1250ms, dim to amber 700ms (2.5s total).

const PATH = "M31 81 C31 45 59 45 59 61 C59 77 87 77 87 41";
const END = { x: 87, y: 41 };

const COLORS = {
  badge: "#2A2F6E",
  trail: "#F7F4EE",
  amber: "#F2A73B",
  light: "#FFFDF5",
};

const T = { intro: 300, glowIn: 250, draw: 1250, settle: 700 };

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => Math.min(Math.max(v, 0), 1);

function mixHex(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return (
    "#" +
    pa
      .map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, "0"))
      .join("")
  );
}

export default function SidekickLogo({
  size = 28,
  animate = false,
  onComplete,
  className,
  title = "Sidekick",
}) {
  const uid = useId().replace(/:/g, "");
  const badgeRef = useRef(null);
  const trailRef = useRef(null);
  const haloRef = useRef(null);
  const dotRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    if (!animate) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onCompleteRef.current?.();
      return;
    }

    const badge = badgeRef.current;
    const trail = trailRef.current;
    const halo = haloRef.current;
    const dot = dotRef.current;
    const L = trail.getTotalLength();
    let raf = 0;
    let start = 0;

    const frame = (ms) => {
      const b = clamp(ms / T.intro);
      badge.setAttribute("opacity", easeOut(b));
      badge.setAttribute(
        "transform",
        `translate(60 60) scale(${lerp(0.94, 1, easeOut(b))}) translate(-60 -60)`
      );

      const gi = easeOut(clamp((ms - T.intro) / T.glowIn));

      const t0 = T.intro + T.glowIn;
      const drawn = L * easeInOut(clamp((ms - t0) / T.draw));
      const p = trail.getPointAtLength(drawn);
      trail.style.strokeDasharray = `${drawn} ${L}`;
      trail.style.opacity = drawn > 0.3 ? 1 : 0;

      const st = clamp((ms - t0 - T.draw) / T.settle);
      const s = easeInOut(st);

      dot.setAttribute("cx", p.x);
      dot.setAttribute("cy", p.y);
      dot.setAttribute("opacity", gi);
      dot.setAttribute("fill", mixHex(COLORS.light, COLORS.amber, s));

      halo.setAttribute("cx", p.x);
      halo.setAttribute("cy", p.y);
      halo.setAttribute("r", lerp(30, 12, s) * lerp(0.6, 1, gi));
      halo.setAttribute("opacity", gi * (1 - s));

      if (st < 1) {
        raf = requestAnimationFrame(() => frame(performance.now() - start));
      } else {
        trail.style.strokeDasharray = "";
        trail.style.opacity = "";
        onCompleteRef.current?.();
      }
    };

    frame(0);
    start = performance.now();
    raf = requestAnimationFrame(() => frame(performance.now() - start));

    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#FFF8E0" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#FFE9A8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD57A" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <rect width="120" height="120" rx="28" />
        </clipPath>
      </defs>

      <rect ref={badgeRef} width="120" height="120" rx="28" fill={COLORS.badge} />

      <g clipPath={`url(#${uid}-clip)`}>
        <path
          ref={trailRef}
          d={PATH}
          stroke={COLORS.trail}
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        <circle
          ref={haloRef}
          cx={END.x}
          cy={END.y}
          r="12"
          fill={`url(#${uid}-glow)`}
          opacity="0"
        />
      </g>

      <circle ref={dotRef} cx={END.x} cy={END.y} r="10" fill={COLORS.amber} />
    </svg>
  );
}
