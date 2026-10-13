/** Shared Fractix blue atmosphere + grid used across Studio and info pages. */
export default function StudioAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 10% -10%, hsl(207 90% 54% / 0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 0%, hsl(199 89% 48% / 0.12), transparent 50%), linear-gradient(180deg, hsl(210 40% 98% / 0.55), transparent 42%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
    </>
  );
}
