"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { email as copy, emailDomains, errors } from "@/content/apply";
import {
  completeWith,
  emailSuggestion,
  ghostDomain,
  ghostText,
  isDisposableEmail,
  isEmailFormatValid,
  normaliseEmail,
} from "../../_lib/email";
import { submitApplication } from "../../_lib/submit";
import { track, type SuggestionKind } from "../../_lib/track";
import { useFlow } from "../apply-flow";
import { StepScreen } from "../step-screen";
import { RoundSubmitButton } from "../ui/button";
import { SuggestionChip } from "../ui/chip";
import { LockIcon } from "../ui/icons";
import { StickyFooter } from "../ui/sticky-footer";
import { TextField } from "../ui/text-field";

type Status = "idle" | "submitting" | "failed";
/**
 * The "Did you mean" state (B), set on blur or a submit attempt. `disposable`:
 * a throwaway inbox, which can't be sent at all.
 */
type Invalid = { suggestion: string | null; disposable?: boolean };

/**
 * Screen 8. States: A empty, E ghost completion (submit disabled until it's
 * accepted), B invalid or likely typo with a fix chip, C ready, D submitting,
 * plus the network error line. Also holds an off-screen spam-trap field.
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
      setInvalid({ suggestion: null, disposable: true });
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
    if (invalid || !check()) return;

    inFlight.current = true;
    setStatus("submitting");
    const trapValue = trap.current?.value ?? "";
    const result = await submitApplication(draft, normaliseEmail(value), trapValue);
    inFlight.current = false;

    if (result.ok) {
      // A filled trap means a bot: the server saved nothing, so record no conversion.
      if (!trapValue) track.submitted(draft, result.submitted);
      completeSubmit(result.submitted);
      return;
    }
    track.submitFailed(draft, result.reason);
    if (result.reason === "invalid_email" || result.reason === "disposable_email") {
      setStatus("idle");
      setInvalid({ suggestion: null, disposable: result.reason === "disposable_email" });
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

  return (
    <StepScreen name="email">
      {/* The design's two lines need ~362px; narrower phones wrap it as one balanced sentence. */}
      <h1 className="font-display text-[28px] leading-8 font-extrabold text-balance">
        {copy.headline.map((line, i) => (
          <span key={i} className="min-[402px]:block">
            {i > 0 && " "}
            {line}
          </span>
        ))}
      </h1>

      <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col">
        <div className="flex min-h-[126px] flex-col">
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
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (!submitting) check();
            }}
            error={
              invalid &&
              (invalid.disposable ? (
                errors.emailDisposable
              ) : fix ? (
                <>
                  {errors.emailInvalid}
                  <span className="mt-2 mb-3 flex">
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
              ) : (
                errors.emailInvalidPlain
              ))
            }
            hint={
              status === "failed" ? (
                <span className="text-error-text">{errors.network}</span>
              ) : ready || submitting ? (
                <>
                  <LockIcon />
                  {copy.privacy}
                </>
              ) : undefined
            }
          />

          {showDomainChips && (
            <div
              role="group"
              aria-label={copy.domainChipsLabel}
              className="-mx-[var(--margin-page)] mt-2.5 flex gap-2.5 overflow-x-auto px-[var(--margin-page)] py-0.5 [scrollbar-width:none] [mask-image:linear-gradient(90deg,#000_calc(100%-var(--margin-page)-16px),transparent)] [&::-webkit-scrollbar]:hidden"
            >
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
        </div>

        {/* Spam trap: off-screen, out of the tab order and hidden from screen
            readers, so only bots fill it. */}
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <label>
            {copy.honeypotLabel}
            <input ref={trap} type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <StickyFooter placement="inline">
          <div className="flex items-center justify-between gap-4">
            <div aria-live="polite" className="min-w-0">
              <p className="font-display text-xl leading-6 font-extrabold">
                {submitting ? copy.sending : copy.lastStep}
              </p>
              <p className="text-[15px] leading-5 text-muted">{sub}</p>
            </div>
            <RoundSubmitButton
              type="submit"
              aria-label={copy.submitLabel}
              disabled={!ready}
              busy={submitting}
            />
          </div>
        </StickyFooter>
      </form>
    </StepScreen>
  );
}
