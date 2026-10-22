"use client";

import { DRAFT_KEY, SUBMITTED_KEY } from "../_lib/storage";
import { useFlow } from "./apply-flow";

// TODO(PST-64, PST-67): development-only debug panel. Remove once the real
// screens and submit are in. Only rendered when NODE_ENV === "development".
export function DevPanel() {
  const { step, draft, submitted } = useFlow();

  const reset = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(SUBMITTED_KEY);
    window.location.assign(window.location.pathname);
  };

  return (
    <details className="mx-[var(--margin-page)] mb-4 rounded-2xl border border-hairline bg-white/70 p-3 text-xs">
      <summary className="cursor-pointer font-bold">Dev · step={step}</summary>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all" data-testid="dev-state">
        {JSON.stringify({ draft, submitted }, null, 2)}
      </pre>
      <button type="button" onClick={reset} className="mt-2 underline">
        Reset localStorage
      </button>
    </details>
  );
}
