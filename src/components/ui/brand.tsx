import { Badge } from "./badge";

/**
 * Version-stamped branding mark used in the sidebar and on the
 * placeholder panels for features that arrive in later phases.
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

/**
 * Honest "arriving later" marker for framework panels that are
 * scaffolded now and implemented in Phase 2.
 *
 * This is deliberately NOT a fake control: the tab it sits behind
 * switches real panels, and this states plainly what is not built yet.
 */
export function PhasePlaceholder({
  phase,
  title,
  description,
  bullets,
}: {
  phase: string;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <Badge tone="primary" className="mb-4">
        {phase}
      </Badge>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="text-sm text-ink-muted mt-2 max-w-md leading-relaxed">
        {description}
      </p>
      <ul className="mt-6 text-left text-sm text-ink-muted space-y-2 max-w-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-ink-subtle max-w-md leading-relaxed">
        This panel is intentionally empty — no placeholder controls or
        simulated results are shown.
      </p>
    </div>
  );
}
