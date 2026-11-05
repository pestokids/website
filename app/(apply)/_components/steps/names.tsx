"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { errors, names as copy, pesto as lines, pestoCheckInLine } from "@/content/apply";
import { checkName } from "@/lib/name-check";
import { validateName, type Kid } from "../../_lib/flow";
import { useFlow } from "../apply-flow";
import { PestoSays } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { usePesto, type PestoController } from "../pesto/use-pesto";
import { QuestionScreen } from "../step-screen";
import { PrimaryButton, SecondaryButton } from "../ui/button";
import { SuggestionChip } from "../ui/chip";
import { CheckIcon, CloseIcon } from "../ui/icons";
import { TextField } from "../ui/text-field";

/** How long typing has to pause before Pesto reads the name back. */
const READ_BACK_MS = 800;

let measure: CanvasRenderingContext2D | null | undefined;

/** Points Pesto's eyes at the text cursor in `input`. */
function followCaret(pesto: PestoController, input: HTMLInputElement) {
  measure ??= document.createElement("canvas").getContext("2d");
  if (!measure) return;
  const cs = getComputedStyle(input);
  measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const caret = input.selectionStart ?? input.value.length;
  const x = Math.min(
    input.clientWidth - 8,
    parseFloat(cs.paddingLeft) + measure.measureText(input.value.slice(0, caret)).width,
  );
  const r = input.getBoundingClientRect();
  pesto.lookAtPoint(r.left + x, r.top + r.height / 2);
}

const errorCopy = {
  invalid: errors.nameInvalid,
  tooLong: errors.nameTooLong,
  duplicate: errors.nameDuplicate,
} as const;

/**
 * - first:  the field edits kid 1 (states A, B). Prefilled when kid 1 exists.
 * - second: kid 1 is a chip, the field is for kid 2 (state C).
 * - review: both kids listed (state D). Only when the screen opens with 2 kids
 *   saved; closing the keyboard in C keeps the field.
 */
type Mode = "first" | "second" | "review";

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

  const others = mode === "second" ? [kids[0].name] : [];
  const result = validateName(input, others);
  const error = !result.ok && result.error !== "empty" ? errorCopy[result.error] : null;
  const secondEmpty = mode === "second" && input.trim() === "";
  const canNext = mode === "review" || result.ok || secondEmpty;

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

  /** Saves the field as kid 1 (adding or renaming). */
  const firstKidAction = (name: string) =>
    kids.length === 0
      ? ({ type: "addKid", name } as const)
      : ({ type: "renameKid", index: 0, name } as const);

  const inputRef = useRef<HTMLInputElement>(null);

  // Pesto: says hello, watches the cursor and reads a name back after a pause.
  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("names"));
  useEffect(() => {
    pesto.say(lines.names.intro);
  }, [pesto]);
  const readBack = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastHeard = useRef("");
  useEffect(() => () => clearTimeout(readBack.current), []);
  const watch = (input: HTMLInputElement) => {
    followCaret(pesto, input);
    clearTimeout(readBack.current);
    readBack.current = setTimeout(() => {
      const heard = validateName(input.value, mode === "second" ? [kids[0].name] : []);
      if (heard.ok && [...heard.name].length >= 2 && heard.name !== lastHeard.current) {
        lastHeard.current = heard.name;
        pesto.say(lines.names.heard(heard.name));
      }
    }, READ_BACK_MS);
  };

  const next = () => {
    if (!canNext) return;
    if (mode === "review" || secondEmpty) advance();
    else if (result.ok && !nudgeFirst(result.name, "next")) {
      advance(mode === "first" ? firstKidAction(result.name) : { type: "addKid", name: result.name });
    }
  };

  const addAnother = () => {
    if (!result.ok) {
      inputRef.current?.focus();
      return;
    }
    if (nudgeFirst(result.name, "add")) return;
    dispatch(firstKidAction(result.name));
    setInput("");
    setNudge(null);
    setMode("second");
  };

  /** "Yes, that's right": carries on with whichever button was tapped. */
  const confirmName = () => {
    if (nudge?.action === "add") addAnother();
    else next();
  };

  const remove = (index: number) => {
    const remaining = kids.filter((_, i) => i !== index);
    dispatch({ type: "removeKid", index });
    setInput(remaining[0]?.name ?? "");
    setMode("first");
  };

  const actions =
    mode === "review" ? (
      <PrimaryButton onClick={next}>{copy.next}</PrimaryButton>
    ) : (
      <div className="flex gap-3">
        {mode === "first" && (
          <SecondaryButton className="w-auto" onMouseDown={keepFocus} onClick={addAnother}>
            {copy.addAnother}
          </SecondaryButton>
        )}
        <PrimaryButton
          className="min-w-0 flex-1"
          disabled={!canNext}
          onMouseDown={keepFocus}
          onClick={next}
        >
          {copy.next}
        </PrimaryButton>
      </div>
    );

  return (
    <QuestionScreen
      name="names"
      says={<PestoSays pesto={pesto} />}
      question={copy.headline.join(" ")}
      sub={copy.sub}
      footer={actions}
    >
      {mode === "review" ? (
        <ReviewList kids={kids} onRemove={remove} />
      ) : (
        <>
          {mode === "second" && (
            <p className="mb-3 flex">
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-day-lime-edge bg-day-tint pr-3.5 pl-2.5 text-[15px] font-extrabold">
                <CheckIcon size={14} />
                {kids[0].name}
              </span>
            </p>
          )}
          <TextField
            ref={inputRef}
            label={mode === "first" ? copy.labelFirst : copy.labelSecond}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Editing dismisses the nudge; a different name gets its own on Next.
              setNudge(null);
              watch(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") next();
            }}
            onKeyUp={(e) => followCaret(pesto, e.currentTarget)}
            onClick={(e) => followCaret(pesto, e.currentTarget)}
            onFocus={(e) => followCaret(pesto, e.currentTarget)}
            onBlur={() => pesto.later(() => pesto.look(0, 0), 300)}
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
        </>
      )}
    </QuestionScreen>
  );
}

const avatarTints = ["bg-day-tint", "bg-day-peach"] as const;

/** First letter as the user sees it (one grapheme, so accents and matras stay whole). */
function initial(name: string): string {
  const [first] = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name);
  return (first?.segment ?? "").toLocaleUpperCase();
}

function ReviewList({ kids, onRemove }: { kids: Kid[]; onRemove: (index: number) => void }) {
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <h2 className="text-[13px] leading-[18px] font-extrabold text-day-sub">{copy.reviewLabel}</h2>
      <ul className="flex flex-col gap-3">
        {kids.map((kid, i) => (
          <li
            key={kid.name}
            className="flex h-14 items-center gap-3 rounded-[13px] border-2 border-day-border bg-white pl-3 shadow-[0_3px_0_var(--color-day-border)]"
          >
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-full font-display text-[15px] leading-none font-extrabold ${avatarTints[i % avatarTints.length]}`}
            >
              {initial(kid.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg leading-6 font-bold">{kid.name}</span>
            <button
              type="button"
              aria-label={copy.remove(kid.name)}
              onClick={() => onRemove(i)}
              className="mr-1.5 grid size-11 shrink-0 place-items-center rounded-full"
            >
              <span className="grid size-6 place-items-center rounded-full bg-day-tile">
                <CloseIcon size={12} strokeWidth={2.4} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-[18px] text-day-sub">{copy.capNote}</p>
    </div>
  );
}
