/**
 * Version-stamped branding mark used in the sidebar and panel headers.
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-xl bg-primary text-on-primary font-extrabold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      HR
    </span>
  );
}
