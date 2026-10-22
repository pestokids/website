"use client";

import { email as copy } from "@/content/apply";
import { useFlow } from "../apply-flow";
import { Headline, PrimaryButton, StepPlaceholder } from "../placeholder";

// Placeholder check only; the real validation (ghost suggestion, typo fix) comes with the email screen.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export function EmailStep() {
  const { draft, dispatch, completeSubmit } = useFlow();
  const ready = looksLikeEmail(draft.email);

  // TODO(PST-64, PST-67): development-only fake submit so the flow can reach
  // "received" before the real Convex submit exists. Remove with the real one.
  const fakeSubmit = () =>
    completeSubmit({
      applicationId: `dev_${Date.now()}`,
      refCode: "PF-DEV0",
      email: draft.email.trim().toLowerCase(),
      kidNames: draft.kids.map((k) => k.name),
    });

  return (
    <StepPlaceholder
      name="email"
      state={ready ? "ready" : draft.email ? "typing" : "empty"}
      footer={
        <>
          <p className="font-display font-bold">{copy.lastStep}</p>
          <p className="text-[13px] text-muted">{ready ? copy.sub.ready : copy.sub.empty}</p>
          {process.env.NODE_ENV === "development" && (
            <PrimaryButton disabled={!ready} onClick={fakeSubmit}>
              Fake submit (dev only)
            </PrimaryButton>
          )}
        </>
      }
    >
      <Headline lines={copy.headline} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{copy.label}</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={copy.placeholder}
          value={draft.email}
          onChange={(e) => dispatch({ type: "setEmail", email: e.target.value })}
          className="h-14 rounded-field border-[1.5px] border-field-rest bg-white px-4 text-lg font-medium"
        />
      </label>
    </StepPlaceholder>
  );
}
