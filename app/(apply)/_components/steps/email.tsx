"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { email as copy, emailDomains, errors, pesto as lines, pestoCheckInLine } from "@/content/apply";
import {
  completeWith,
  emailSuggestion,
  ghostDomain,
  ghostText,
  isDisposableEmail,
  isEmailFormatValid,
  normaliseEmail,
} from "../../_lib/email";
import { buzz, burstStar, chirp, preloadCelebration } from "../../_lib/feel";
import { track, type SuggestionKind } from "../../_lib/track";
import { useFlow } from "../apply-flow";
import { PestoSays } from "../pesto/pesto";
import { useIdleCheckIn } from "../pesto/use-idle-check-in";
import { prefersReducedMotion, usePesto, type PestoController } from "../pesto/use-pesto";
import { QuestionScreen } from "../step-screen";
import { SubmitButton } from "../ui/button";
import { SuggestionChip } from "../ui/chip";
import { LockIcon } from "../ui/icons";
import { TextField } from "../ui/text-field";

/** A pause in typing before Pesto judges the address. */
const SETTLE_MS = 750;
/** The star burst's length: Received waits for it (the request never does). */
const BURST_MS = 650;

let measure: CanvasRenderingContext2D | null | undefined;

/**
 * The submit code and its Convex client, only needed on this screen: fetched
 * when it mounts, so it's loaded long before the tap. A failed fetch is tried
 * again on the tap.
 */
let submitModule: Promise<typeof import("../../_lib/submit")> | undefined;
function loadSubmit() {
  submitModule ??= import("../../_lib/submit").catch((error: unknown) => {
    submitModule = undefined;
    throw error;
  });
  return submitModule;
}

/** Points Pesto's eyes at the end of the typed address. */
function followTyping(pesto: PestoController, input: HTMLInputElement) {
  measure ??= document.createElement("canvas").getContext("2d");
  if (!measure) return;
  const cs = getComputedStyle(input);
  measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const x = Math.min(
    input.clientWidth - 20,
    parseFloat(cs.paddingLeft) + measure.measureText(input.value).width,
  );
  const r = input.getBoundingClientRect();
  pesto.lookAtPoint(r.left + x, r.top + r.height / 2);
}

type Status = "idle" | "submitting" | "failed";
/**
 * The invalid state (B), set on blur or a submit attempt: "Did you mean" (with
 * a fix chip when there's a suggestion), or a plain line when the address
 * can't be used: `disposable` (a throwaway inbox) or `undeliverable` (its
 * domain can't receive mail).
 */
type Invalid = { suggestion: string | null; problem?: "disposable" | "undeliverable" };

const problemOf = {
  invalid_email: undefined,
  disposable_email: "disposable",
  undeliverable_email: "undeliverable",
} as const;

/**
 * Screen 8. States: A empty, E ghost completion (submit disabled until it's
 * accepted), B invalid or likely typo with a fix chip, C ready, D submitting,
 * plus the network error line. Submitting first asks the server whether the
 * domain can receive mail; if not, it's state B with the "can't send" line.
 * Also holds an off-screen spam-trap field.
 */
export function EmailStep() {
  const { draft, dispatch, completeSubmit } = useFlow();
  const value = draft.email;

  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState<Invalid | null>(null);
  // A chip tapped before anything is typed becomes the ghost's domain.
  const [preferredDomain, setPreferredDomain] = useState<string | undefined>();
  // Each likely-typo warning is shown once per address, so an unusual but
  // real domain can still go through after a second look.
  const warnedTypos = useRef(new Set<string>());
  const inFlight = useRef(false);
  const trap = useRef<HTMLInputElement>(null);
  const formId = useId();

  const submitting = status === "submitting";
  // No ghost over state B: the fix chip is the suggestion there.
  const ghost = focused && !submitting && !invalid ? ghostText(value, preferredDomain) : null;
  const ghostTarget = ghost ? ghostDomain(value, preferredDomain) : null;
  const formatValid = isEmailFormatValid(value);
  const ready = formatValid && !ghost && !invalid;
  const showDomainChips = !submitting && !invalid && (!value.includes("@") || ghost !== null);

  const setEmail = (next: string) => {
    dispatch({ type: "setEmail", email: next });
    setInvalid(null);
    if (status === "failed") setStatus("idle");
  };

  const applySuggestion = (next: string, kind: SuggestionKind) => {
    setEmail(next);
    track.emailSuggestionUsed(draft, next, kind);
  };

  const pickDomain = (domain: string) => {
    if (!value.trim()) setPreferredDomain(domain);
    else applySuggestion(completeWith(value, domain), "chip");
  };

  const acceptGhost = () => {
    if (ghost) applySuggestion(value + ghost, "ghost");
  };

  /** Shows state B if the address is wrong or looks like a typo. True when it can be sent. */
  const check = (): boolean => {
    if (!value.trim()) return false;
    const suggestion = emailSuggestion(value, preferredDomain);
    if (!formatValid) {
      setInvalid({ suggestion });
      return false;
    }
    const email = normaliseEmail(value);
    if (isDisposableEmail(email)) {
      setInvalid({ suggestion: null, problem: "disposable" });
      return false;
    }
    if (suggestion && !warnedTypos.current.has(email)) {
      warnedTypos.current.add(email);
      setInvalid({ suggestion });
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (inFlight.current) return;
    if (ghost) return acceptGhost();
    // Spam trap first: a filled trap skips every check and goes straight to
    // the server, which answers with a decoy success. Bots learn nothing.
    const trapValue = trap.current?.value ?? "";
    if (!trapValue && (invalid || !check())) return;

    inFlight.current = true;
    setStatus("submitting");
    // Started from the tap (audio needs it), alongside the request: never before it.
    chirp();
    buzz();
    burstStar();
    const sentAt = Date.now();
    const result = await loadSubmit().then(
      ({ submitApplication }) => submitApplication(draft, normaliseEmail(value), trapValue),
      () => ({ ok: false, reason: "network" }) as const,
    );

    if (result.ok) {
      // A filled trap means a bot: the server saved nothing, so record no conversion.
      if (!trapValue) track.submitted(draft, result.submitted);
      // Let the star burst finish before Received replaces the screen.
      const wait = prefersReducedMotion() ? 0 : Math.max(0, BURST_MS - (Date.now() - sentAt));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      completeSubmit(result.submitted);
      return;
    }
    inFlight.current = false;
    track.submitFailed(draft, result.reason);
    if (
      result.reason === "invalid_email" ||
      result.reason === "disposable_email" ||
      result.reason === "undeliverable_email"
    ) {
      setStatus("idle");
      setInvalid({ suggestion: null, problem: problemOf[result.reason] });
    } else {
      setStatus("failed");
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Handled here, not by implicit form submission: that does nothing while
    // the submit button is disabled, and Enter must accept the ghost.
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
      return;
    }
    if (!ghost) return;
    const input = event.currentTarget;
    // type="email" inputs don't expose the caret in every browser (null).
    const caretAtEnd = input.selectionStart === null || input.selectionStart === value.length;
    if ((event.key === "ArrowRight" && caretAtEnd) || (event.key === "Tab" && !event.shiftKey)) {
      event.preventDefault();
      acceptGhost();
    }
  };

  const fix = invalid?.suggestion;
  const sub = submitting
    ? copy.sub.submitting
    : invalid
      ? copy.sub.invalid
      : ready
        ? copy.sub.ready
        : value.trim()
          ? copy.sub.typing
          : copy.sub.empty;

  // ── Pesto ──
  // Leans in and follows the typing; puzzled next to the typo suggestion; a
  // settled, valid address gets happy eyes, a thumbs-up and "Looks perfect!".
  const pesto = usePesto();
  useIdleCheckIn(pesto, pestoCheckInLine("email"));
  useEffect(() => {
    pesto.say(lines.email.intro);
  }, [pesto]);
  // The submit and the celebration after it, fetched while the address is typed.
  useEffect(() => {
    loadSubmit().catch(() => {});
    preloadCelebration();
  }, []);
  const praised = useRef("");
  const puzzledBy = useRef("");
  const typo = !submitting && fix ? fix : null;
  useEffect(() => {
    pesto.set("puzzled", Boolean(typo));
    if (typo) {
      pesto.set("lean", false);
      pesto.set("thumbs-up", false);
      pesto.look(0, 0);
      if (puzzledBy.current !== value) {
        puzzledBy.current = value;
        pesto.say(lines.email.typo(value.split("@").pop() ?? "", typo.split("@").pop() ?? ""));
      }
      return;
    }
    if (!ready && !submitting) {
      pesto.set("thumbs-up", false);
      pesto.set("lean", focused && value.trim() !== "");
      return;
    }
    // Judged once the typing settles.
    const t = setTimeout(() => {
      pesto.set("lean", false);
      pesto.set("thumbs-up", true);
      pesto.look(0, 0);
      if (praised.current !== value && !submitting) {
        praised.current = value;
        pesto.say(lines.email.good);
        buzz();
      }
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [pesto, typo, ready, submitting, focused, value]);

  return (
    <QuestionScreen
      name="email"
      says={<PestoSays pesto={pesto} badges />}
      question={copy.headline.join(" ")}
      sub={submitting ? copy.sending : copy.lastStep}
      footer={
        <>
          <p aria-live="polite" className="-mb-1 text-center text-[13px] leading-[18px] font-semibold text-day-sub">
            {sub}
          </p>
          <SubmitButton type="submit" form={formId} disabled={!ready} busy={submitting}>
            {copy.submitLabel}
          </SubmitButton>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col">
        <TextField
          label={copy.label}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          autoFocus
          placeholder={copy.placeholder}
          value={value}
          ghost={ghost ?? undefined}
          readOnly={submitting}
          valid={ready || submitting}
          onChange={(e) => {
            setEmail(e.target.value);
            followTyping(pesto, e.target);
          }}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            setFocused(true);
            followTyping(pesto, e.currentTarget);
          }}
          onBlur={() => {
            setFocused(false);
            pesto.later(() => pesto.look(0, 0), 300);
            if (!submitting) check();
          }}
          error={
            invalid &&
            (invalid.problem === "disposable" ? (
              errors.emailDisposable
            ) : fix ? (
              <>
                {errors.emailInvalid}
                <span className="mt-2 flex">
                  <SuggestionChip
                    highlighted
                    // Keep the keyboard up: don't move focus off the field.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(fix, "typo")}
                  >
                    {copy.suggestion(fix)}
                  </SuggestionChip>
                </span>
              </>
            ) : invalid.problem === "undeliverable" ? (
              errors.emailUndeliverable
            ) : (
              errors.emailInvalidPlain
            ))
          }
          hint={status === "failed" ? <span className="text-error-text">{errors.network}</span> : undefined}
        />

        {showDomainChips && (
          <div role="group" aria-label={copy.domainChipsLabel} className="mt-2.5 flex flex-wrap gap-x-2 gap-y-3">
            {emailDomains.map((domain) => (
              <SuggestionChip
                key={domain}
                highlighted={domain === (ghostTarget ?? (!value.trim() && preferredDomain))}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickDomain(domain)}
              >
                {copy.domainChip(domain)}
              </SuggestionChip>
            ))}
          </div>
        )}

        <p className="mt-3.5 flex items-center gap-2 rounded-xl bg-day-tile px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-day-sub">
          <LockIcon className="shrink-0" />
          {copy.privacy}
        </p>

        {/* Spam trap: off-screen, out of the tab order and hidden from screen
            readers, so only bots fill it. */}
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <label>
            {copy.honeypotLabel}
            <input ref={trap} type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </form>
    </QuestionScreen>
  );
}
