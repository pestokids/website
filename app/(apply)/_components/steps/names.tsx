"use client";

import { useRef, useState, type MouseEvent } from "react";
import { errors, MAX_KIDS, names as copy } from "@/content/apply";
import { checkName } from "@/lib/name-check";
import { validateName, type Kid } from "../../_lib/flow";
import { useFlow } from "../apply-flow";
import { Headline } from "../placeholder";
import { PrimaryButton, SecondaryButton } from "../ui/button";
import { SuggestionChip } from "../ui/chip";
import { CheckIcon, CloseIcon } from "../ui/icons";
import { StepScreen } from "../step-screen";
import { StickyFooter } from "../ui/sticky-footer";
import { TextField } from "../ui/text-field";

const errorCopy = {
  invalid: errors.nameInvalid,
  tooLong: errors.nameTooLong,
  duplicate: errors.nameDuplicate,
} as const;

/**
 * - first:  the field edits kid 1 (states A, B). Prefilled when kid 1 exists.
 * - more:   the saved kids are chips, the field adds the next one: kid 2
 *   (state C) or kid 3 (state C3, no "Add another kid" at the cap).
 * - review: every kid listed (state D). Only when the screen opens with 2 or
 *   more kids saved; closing the keyboard in C/C3 keeps the field.
 */
type Mode = "first" | "more" | "review";

/** Keeps focus (and the keyboard) in the field when an action button is tapped. */
const keepFocus = (event: MouseEvent) => event.preventDefault();

/** A likely-fake name waiting on a second look, and the button that was tapped. */
type Nudge = { name: string; action: "next" | "add" };

export function NamesStep() {
  const { draft, dispatch, advance } = useFlow();
  const { kids } = draft;
  const [mode, setMode] = useState<Mode>(kids.length >= 2 ? "review" : "first");
  const [input, setInput] = useState(() => (kids.length === 1 ? kids[0].name : ""));
  const [nudge, setNudge] = useState<Nudge | null>(null);
  // Names already nudged (lowercased): each gets the nudge once, then goes through.
  const nudged = useRef(new Set<string>());

  const others = mode === "more" ? kids.map((k) => k.name) : [];
  const result = validateName(input, others);
  const error = !result.ok && result.error !== "empty" ? errorCopy[result.error] : null;
  // A later kid's field left empty: Next carries on with the kids already added.
  const moreEmpty = mode === "more" && input.trim() === "";
  const canNext = mode === "review" || result.ok || moreEmpty;
  // Room for a kid after the one in the field.
  const canAddAnother = mode === "first" ? MAX_KIDS > 1 : kids.length + 2 <= MAX_KIDS;

  /**
   * Shows the nudge instead of acting if `name` looks fake and hasn't been
   * nudged yet. Saved names (coming back to this screen) aren't nudged again.
   */
  const nudgeFirst = (name: string, action: Nudge["action"]): boolean => {
    const key = name.toLocaleLowerCase();
    if (checkName(name) === "ok" || nudged.current.has(key)) return false;
    if (kids.some((k) => k.name.toLocaleLowerCase() === key)) return false;
    nudged.current.add(key);
    setNudge({ name, action });
    return true;
  };

  /** Saves the field: kid 1 (adding or renaming), or the next kid. */
  const saveAction = (name: string) =>
    mode === "first" && kids.length > 0
      ? ({ type: "renameKid", index: 0, name } as const)
      : ({ type: "addKid", name } as const);

  const inputRef = useRef<HTMLInputElement>(null);

  const next = () => {
    if (!canNext) return;
    if (mode === "review" || moreEmpty) advance();
    else if (result.ok && !nudgeFirst(result.name, "next")) advance(saveAction(result.name));
  };

  const addAnother = () => {
    if (!canAddAnother) return;
    if (!result.ok) {
      inputRef.current?.focus();
      return;
    }
    if (nudgeFirst(result.name, "add")) return;
    dispatch(saveAction(result.name));
    setInput("");
    setNudge(null);
    setMode("more");
  };

  /** "Yes, that's right": carries on with whichever button was tapped. */
  const confirmName = () => {
    if (nudge?.action === "add") addAnother();
    else next();
  };

  const remove = (index: number) => {
    const remaining = kids.filter((_, i) => i !== index);
    dispatch({ type: "removeKid", index });
    // The list stays while it has 2 or more kids; with 1 left, the field edits them.
    if (remaining.length >= 2) return;
    setInput(remaining[0]?.name ?? "");
    setMode("first");
  };

  return (
    <StepScreen
      name="names"
      footer={mode === "review" && <PrimaryButton onClick={next}>{copy.next}</PrimaryButton>}
    >
      <Headline lines={copy.headline} />

      {mode === "review" ? (
        <ReviewList kids={kids} onRemove={remove} />
      ) : (
        <>
          {mode === "more" && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {kids.map((kid) => (
                <li
                  key={kid.name}
                  className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-lime-deep bg-lime/20 pr-3.5 pl-2.5 text-[16px] font-medium"
                >
                  <CheckIcon size={15} className="shrink-0" />
                  <span className="truncate">{kid.name}</span>
                </li>
              ))}
            </ul>
          )}
          <TextField
            ref={inputRef}
            className={mode === "more" ? "mt-3.5" : "mt-6"}
            label={copy.labels[mode === "more" ? kids.length : 0]}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Editing dismisses the nudge; a different name gets its own on Next.
              setNudge(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") next();
            }}
            onClear={() => {
              setInput("");
              setNudge(null);
            }}
            clearLabel={copy.clear}
            error={error}
            hint={
              nudge && (
                <>
                  {copy.nudge(nudge.name)}
                  <span className="mt-2 mb-1 flex">
                    <SuggestionChip onMouseDown={keepFocus} onClick={confirmName}>
                      {copy.nudgeConfirm}
                    </SuggestionChip>
                  </span>
                </>
              )
            }
            placeholder={copy.placeholder}
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            autoFocus
          />
          <StickyFooter placement="inline" className="mt-2.5">
            <div className="flex justify-between gap-3">
              {canAddAnother && (
                <SecondaryButton className="w-auto" onMouseDown={keepFocus} onClick={addAnother}>
                  {copy.addAnother}
                </SecondaryButton>
              )}
              <PrimaryButton
                className={canAddAnother ? "w-[120px]" : "w-full"}
                disabled={!canNext}
                onMouseDown={keepFocus}
                onClick={next}
              >
                {copy.next}
              </PrimaryButton>
            </div>
          </StickyFooter>
        </>
      )}
    </StepScreen>
  );
}

const avatarTints = ["bg-lime/20", "bg-orange/15"] as const;

/** First letter as the user sees it (one grapheme, so accents and matras stay whole). */
function initial(name: string): string {
  const [first] = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name);
  return (first?.segment ?? "").toLocaleUpperCase();
}

function ReviewList({ kids, onRemove }: { kids: Kid[]; onRemove: (index: number) => void }) {
  return (
    <div className="mt-6 flex flex-col gap-1.5">
      <h2 className="text-sm leading-[18px] font-semibold">{copy.reviewLabel}</h2>
      <ul className="flex flex-col gap-3">
        {kids.map((kid, i) => (
          <li
            key={kid.name}
            className="flex h-14 items-center gap-3 rounded-field border-[1.5px] border-field-rest bg-white pl-3.5"
          >
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-full font-display text-[15px] leading-none font-extrabold ${avatarTints[i % avatarTints.length]}`}
            >
              {initial(kid.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg leading-6 font-medium">{kid.name}</span>
            <button
              type="button"
              aria-label={copy.remove(kid.name)}
              onClick={() => onRemove(i)}
              className="mr-1.5 grid size-11 shrink-0 place-items-center rounded-full"
            >
              <span className="grid size-6 place-items-center rounded-full bg-forest/8">
                <CloseIcon size={12} strokeWidth={2.4} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[13px] leading-[18px] text-muted">{copy.capNote}</p>
    </div>
  );
}
