"use client";

import { useState } from "react";
import { errors, MAX_KIDS, names as copy } from "@/content/apply";
import { validateName } from "../../_lib/flow";
import { useFlow } from "../apply-flow";
import { Headline, PrimaryButton, SecondaryButton, StepPlaceholder } from "../placeholder";

const errorCopy = {
  invalid: errors.nameInvalid,
  tooLong: errors.nameTooLong,
  duplicate: errors.nameDuplicate,
} as const;

export function NamesStep() {
  const { draft, dispatch, advance } = useFlow();
  const [input, setInput] = useState("");
  const kidNames = draft.kids.map((k) => k.name);
  const capReached = draft.kids.length >= MAX_KIDS;
  const result = validateName(input, kidNames);
  const error = !result.ok && result.error !== "empty" ? errorCopy[result.error] : null;
  const canNext = result.ok || (input.trim() === "" && draft.kids.length > 0);
  const canAddAnother = draft.kids.length === 0 && result.ok;

  const addAnother = () => {
    if (!result.ok) return;
    dispatch({ type: "addKid", name: result.name });
    setInput("");
  };

  const next = () => {
    if (result.ok) advance({ type: "addKid", name: result.name });
    else if (canNext) advance();
  };

  return (
    <StepPlaceholder
      name="names"
      state={`${draft.kids.length} kid(s) committed${capReached ? " · cap reached" : ""}`}
      footer={
        <>
          {draft.kids.length === 0 && (
            <SecondaryButton disabled={!canAddAnother} onClick={addAnother}>
              {copy.addAnother}
            </SecondaryButton>
          )}
          <PrimaryButton disabled={!canNext} onClick={next}>
            {copy.next}
          </PrimaryButton>
        </>
      }
    >
      <Headline lines={copy.headline} />

      {draft.kids.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{copy.reviewLabel}</p>
          <ul className="flex flex-col gap-2">
            {draft.kids.map((kid, i) => (
              <li
                key={kid.name}
                className="flex items-center justify-between rounded-field border border-hairline bg-white px-4 py-2"
              >
                <span>{copy.chip(kid.name)}</span>
                <button
                  type="button"
                  aria-label={copy.remove(kid.name)}
                  onClick={() => dispatch({ type: "removeKid", index: i })}
                  className="size-11"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {capReached && <p className="text-[13px] text-muted">{copy.capNote}</p>}
        </div>
      )}

      {!capReached && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">
            {draft.kids.length === 0 ? copy.labelFirst : copy.labelSecond}
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && next()}
            placeholder={copy.placeholder}
            autoCapitalize="words"
            autoComplete="off"
            autoFocus
            aria-invalid={error ? true : undefined}
            className="h-14 rounded-field border-[1.5px] border-field-rest bg-white px-4 text-lg font-medium"
          />
          <span aria-live="polite" className="min-h-[18px] text-[13px] text-error-text">
            {error}
          </span>
        </label>
      )}
    </StepPlaceholder>
  );
}
