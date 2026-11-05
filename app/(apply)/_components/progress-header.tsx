"use client";

import { useEffect, useState } from "react";
import { progress, PROGRESS_SEGMENTS } from "@/content/apply";
import { onStarBurst } from "../_lib/feel";
import { progressSegment } from "../_lib/flow";
import { useFlow } from "./apply-flow";
import { ProgressHeader } from "./ui/progress-header";

/** The flow's header: back, the progress track and its star, on screens 2–8 only. */
export function FlowProgressHeader() {
  const { step, back } = useFlow();
  const [burst, setBurst] = useState(0);
  useEffect(() => onStarBurst(() => setBurst((n) => n + 1)), []);
  const current = progressSegment(step);
  if (current === null) return null;

  return (
    <ProgressHeader
      current={current}
      total={PROGRESS_SEGMENTS}
      label={progress.label(current)}
      backLabel={progress.back}
      onBack={back}
      burst={burst}
    />
  );
}
