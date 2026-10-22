"use client";

import { welcome } from "@/content/apply";
import { config } from "@/lib/config";
import { useFlow } from "../apply-flow";
import { Headline, StepPlaceholder } from "../placeholder";
import { PrimaryButton } from "../ui/button";

export function WelcomeStep() {
  const { advance } = useFlow();
  return (
    <StepPlaceholder
      name="welcome"
      footer={
        <>
          <PrimaryButton onClick={() => advance()}>{welcome.cta}</PrimaryButton>
          <p className="text-center text-[13px] text-muted">
            {welcome.footer(config.admissionsCloseDate.short)}
          </p>
        </>
      }
    >
      <Headline lines={welcome.headline} />
    </StepPlaceholder>
  );
}
