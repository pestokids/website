"use client";

import Link from "next/link";
import { useState } from "react";
import { names, progress, PROGRESS_SEGMENTS } from "@/content/apply";
import { PrimaryButton, SecondaryButton } from "../../../_components/ui/button";
import { ProgressHeader } from "../../../_components/ui/progress-header";
import { StickyFooter } from "../../../_components/ui/sticky-footer";
import { TextField } from "../../../_components/ui/text-field";
import { useKeyboardInset } from "../../../_components/ui/use-keyboard-inset";

/**
 * Names-like screen for checking, on a real phone, that the action row
 * floats directly above the keyboard and returns to the bottom when it closes.
 */
export function FooterDemo() {
  const [value, setValue] = useState("");
  const [inline, setInline] = useState(false);
  const inset = useKeyboardInset();

  const actions = (
    <div className="flex gap-3">
      <SecondaryButton className="flex-1">{names.addAnother}</SecondaryButton>
      <PrimaryButton className="w-[120px]" disabled={!value.trim()}>
        {names.next}
      </PrimaryButton>
    </div>
  );

  return (
    <>
      <ProgressHeader
        current={1}
        total={PROGRESS_SEGMENTS}
        label={progress.label(1)}
        backLabel={progress.back}
        onBack={() => history.back()}
      />
      <main className="flex flex-1 flex-col gap-4 px-[var(--margin-page)] pt-4">
        <h1 className="font-display text-[28px] leading-8 font-extrabold">
          {names.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <TextField
          label={names.labels[0]}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClear={() => setValue("")}
          clearLabel={names.clear}
          placeholder={names.placeholder}
          autoCapitalize="words"
          autoComplete="off"
        />
        <p className="text-[13px] text-muted">
          Keyboard inset: {inset}px ·{" "}
          <button type="button" className="underline" onClick={() => setInline((v) => !v)}>
            placement: {inline ? "inline" : "end"}
          </button>{" "}
          · <Link href="/apply/_kit" className="underline">back to kit</Link>
        </p>
        <StickyFooter placement={inline ? "inline" : "end"}>{actions}</StickyFooter>
      </main>
    </>
  );
}
