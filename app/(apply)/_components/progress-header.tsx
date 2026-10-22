"use client";

import { progress, PROGRESS_SEGMENTS } from "@/content/apply";
import { progressSegment } from "../_lib/flow";
import { useFlow } from "./apply-flow";
import { ProgressHeader } from "./ui/progress-header";

/** The flow's header: back + 7 segments, on screens 2–8 only. */
export function FlowProgressHeader() {
  const { step, back } = useFlow();
  const current = progressSegment(step);
  if (current === null) return null;

  return (
    <ProgressHeader
      current={current}
      total={PROGRESS_SEGMENTS}
      label={progress.label(current)}
      backLabel={progress.back}
      onBack={back}
    />
  );
}
