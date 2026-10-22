"use client";

import { why } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { Headline, StepPlaceholder } from "../placeholder";
import { PrimaryButton } from "../ui/button";

export function WhyStep() {
  const { advance } = useFlow();
  return (
    <StepPlaceholder
      name="why"
      footer={<PrimaryButton onClick={() => advance()}>{why.cta}</PrimaryButton>}
    >
      <Headline lines={why.headline} />
      <p>{why.sub}</p>
      <ol className="list-inside list-decimal">
        {why.podium.map((p) => (
          <li key={p.rank}>
            {p.label}
            {p.tag ? ` (${p.tag})` : ""}
          </li>
        ))}
      </ol>
      <p className="font-display font-extrabold text-orange">{why.seal}</p>
    </StepPlaceholder>
  );
}
