import { ChevronLeftIcon } from "./icons";

/**
 * Round back button + segmented progress (screens 2–8). Segments before and
 * at `current` are lime-deep; the current one also glows. The bar is a
 * progressbar labelled "Step n of N".
 */
export function ProgressHeader({
  current,
  total,
  label,
  backLabel,
  onBack,
}: {
  /** 1-based. */
  current: number;
  total: number;
  /** e.g. "Step 3 of 7". */
  label: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <header className="flex items-center gap-4 px-[var(--margin-page)] pt-4 pb-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        // 40px visual, 44px tap target.
        className="relative grid size-10 shrink-0 place-items-center rounded-full border border-hairline bg-white/90 text-forest shadow-unselected transition-transform duration-150 ease-step before:absolute before:-inset-0.5 before:content-[''] motion-safe:active:scale-[0.94]"
      >
        <ChevronLeftIcon size={18} />
      </button>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="flex flex-1 gap-[5px]"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-segment transition-colors duration-200 ${
              i < current ? "bg-lime-deep" : "bg-segment-todo"
            } ${i === current - 1 ? "shadow-segment-glow" : ""}`}
          />
        ))}
      </div>
    </header>
  );
}
