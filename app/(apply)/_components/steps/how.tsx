"use client";

import { how } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { Headline, PrimaryButton, StepPlaceholder } from "../placeholder";

export function HowStep() {
  const { advance, family } = useFlow();
  return (
    <StepPlaceholder
      name="how"
      state={family.plural ? "2 kids" : "1 kid"}
      footer={<PrimaryButton onClick={() => advance()}>{how.cta}</PrimaryButton>}
    >
      <Headline lines={how.lines} />
      <p className="text-orange">{how.aside}</p>
      <p>{how.sub(family)}</p>
    </StepPlaceholder>
  );
}
