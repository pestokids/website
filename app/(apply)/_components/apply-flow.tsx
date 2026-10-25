"use client";

import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Family } from "@/content/apply";
import { loadFirstTouch } from "@/lib/first-touch";
import {
  captureAttribution,
  clampStep,
  createDraft,
  initialStep,
  isStep,
  nextStep,
  pathTo,
  prevStep,
  reducer,
  type Action,
  type Draft,
  type Step,
  type Submitted,
} from "../_lib/flow";
import { familyOf } from "../_lib/personalise";
import { consumeDevReset, loadDraft, loadSubmitted, saveDraft, saveSubmitted } from "../_lib/storage";
import { track } from "../_lib/track";
import { FlowProgressHeader } from "./progress-header";
import { AfterSchoolStep } from "./steps/after-school";
import { AgeStep } from "./steps/age";
import { EmailStep } from "./steps/email";
import { GoalsStep } from "./steps/goals";
import { HowStep } from "./steps/how";
import { NamesStep } from "./steps/names";
import { ReceivedStep } from "./steps/received";
import { WelcomeStep } from "./steps/welcome";
import { WhyStep } from "./steps/why";

// ── History ──────────────────────────────────────────────────────────────────
// One history entry per step. Each entry we create carries `pestoIdx` (its
// position in the flow's history), so the header back button knows whether
// history.back() stays inside the flow. Next.js merges its own router state
// into whatever we pass to pushState/replaceState.
//
// The current ?step= is read through a tiny external store (popstate + our own
// notifications) so it's never a render behind pushState/replaceState.

type HistoryState = { pestoIdx?: number } | null;

const urlListeners = new Set<() => void>();

function notifyUrl() {
  urlListeners.forEach((listener) => listener());
}

function subscribeUrl(listener: () => void) {
  urlListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    urlListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

const getUrlStep = () => new URLSearchParams(window.location.search).get("step");
const getServerUrlStep = () => null;

function stepUrl(step: Step): string {
  return `/apply?step=${step}`;
}

/** The current URL without ?step=, so UTMs stay on the first entry only. */
function firstEntryUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("step");
  return url.pathname + url.search + url.hash;
}

function currentIdx(): number | null {
  const idx = (window.history.state as HistoryState)?.pestoIdx;
  return typeof idx === "number" ? idx : null;
}

function pushStep(step: Step) {
  const idx = (currentIdx() ?? 0) + 1;
  window.history.pushState({ pestoIdx: idx }, "", stepUrl(step));
  notifyUrl();
}

function replaceStep(step: Step, url = stepUrl(step)) {
  window.history.replaceState({ pestoIdx: currentIdx() ?? 0 }, "", url);
  notifyUrl();
}

/**
 * Lines history up with the step we land on. A reload of one of our ?step=
 * entries keeps the browser's history. A fresh entry (new tab, shared link,
 * bare /apply) that resumes mid-flow gets the steps before it rebuilt behind
 * it, so the OS back gesture walks back through the flow.
 */
function syncHistoryOnLoad(draft: Draft, step: Step, urlStep: string | null) {
  if (currentIdx() !== null && urlStep !== null) {
    if (urlStep !== step) replaceStep(step);
    return;
  }
  if (step === "received") {
    window.history.replaceState({ pestoIdx: 0 }, "", stepUrl("received"));
  } else {
    window.history.replaceState({ pestoIdx: 0 }, "", firstEntryUrl());
    pathTo(draft, step)
      .slice(1)
      .forEach((s, i) => window.history.pushState({ pestoIdx: i + 1 }, "", stepUrl(s)));
  }
  notifyUrl();
}

// ── Context ──────────────────────────────────────────────────────────────────

type FlowState = { draft: Draft; submitted: Submitted | null };

export type FlowContextValue = {
  step: Step;
  draft: Draft;
  submitted: Submitted | null;
  family: Family;
  dispatch: (action: Action) => void;
  /** Applies `action` (if any), then moves to the next step. */
  advance: (action?: Action) => void;
  back: () => void;
  canGoBack: boolean;
  /** Stores the submitted record, clears the draft and replaces history with "received". */
  completeSubmit: (submitted: Submitted) => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function useFlow(): FlowContextValue {
  const value = use(FlowContext);
  if (!value) throw new Error("useFlow must be used inside <ApplyFlow>");
  return value;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ApplyFlow() {
  const [state, setState] = useState<FlowState | null>(null);
  const urlStep = useSyncExternalStore(subscribeUrl, getUrlStep, getServerUrlStep);

  // First load: read storage, capture first touch, resume. Renders nothing
  // until then, so the server HTML never flashes the wrong step.
  useEffect(() => {
    // Development only: /apply?reset=1 starts over. Stripped from production builds.
    if (process.env.NODE_ENV === "development") consumeDevReset();
    const urlStepNow = getUrlStep();
    const submitted = loadSubmitted();
    let draft = loadDraft() ?? createDraft(Date.now());
    if (!submitted) {
      draft = captureAttribution(draft, window.location.href, document.referrer, loadFirstTouch());
    }
    const step = initialStep(draft, urlStepNow, submitted);
    if (step !== "received") draft = reducer(draft, { type: "setStep", step });
    if (!submitted) saveDraft(draft);
    track.source(draft);
    syncHistoryOnLoad(draft, step, urlStepNow);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of localStorage after mount
    setState({ draft, submitted });
  }, []);

  // The step on screen: the URL's ?step=, limited to what the draft allows
  // (covers browser back/forward into a step that's no longer valid).
  let step: Step | null = null;
  if (state) {
    if (state.submitted) step = "received";
    else if (!isStep(urlStep) || urlStep === "received") step = "welcome";
    else step = clampStep(state.draft, urlStep);
  }

  // ff_step_viewed once per screen shown (each age screen counts).
  const kidsCount = state?.submitted ? state.submitted.kidNames.length : (state?.draft.kids.length ?? 0);
  const viewed = useRef<Step | null>(null);
  useEffect(() => {
    if (!step || viewed.current === step) return;
    viewed.current = step;
    track.stepViewed(step, kidsCount);
  }, [step, kidsCount]);

  // Keep the URL and the saved draft in line with the step on screen.
  useEffect(() => {
    if (!state || !step) return;
    if (urlStep !== step && !(urlStep === null && step === "welcome")) replaceStep(step);
    if (step !== "received" && state.draft.step !== step) {
      saveDraft(reducer(state.draft, { type: "setStep", step }));
    }
  }, [state, step, urlStep]);

  if (!state || !step) return null;

  const draft: Draft = step === "received" ? state.draft : { ...state.draft, step };
  const kidNames = state.submitted ? state.submitted.kidNames : draft.kids.map((k) => k.name);

  const commit = (next: Draft) => {
    saveDraft(next);
    setState({ ...state, draft: next });
  };

  const value: FlowContextValue = {
    step,
    draft,
    submitted: state.submitted,
    family: familyOf(kidNames),
    canGoBack: step !== "welcome" && step !== "received",

    dispatch(action) {
      if (state.submitted) return;
      const next = reducer(draft, action);
      if (next !== draft) commit(next);
    },

    advance(action) {
      if (step === "received") return;
      const updated = action ? reducer(draft, action) : draft;
      const target = nextStep(updated, step);
      if (!target) return;
      if (step === "welcome") track.started(updated);
      else track.stepCompleted(step, updated);
      commit(reducer(updated, { type: "setStep", step: target }));
      pushStep(target);
    },

    back() {
      if (step === "received") return;
      const target = prevStep(draft, step);
      if (!target) return;
      // Go through browser history when we can, so both back buttons agree.
      if ((currentIdx() ?? 0) > 0) window.history.back();
      else replaceStep(target, target === "welcome" ? "/apply" : stepUrl(target));
    },

    completeSubmit(submitted) {
      saveSubmitted(submitted);
      setState({ ...state, submitted });
      replaceStep("received");
    },
  };

  return (
    <FlowContext value={value}>
      <FlowProgressHeader />
      <main className="flex flex-1 flex-col px-[var(--margin-page)]">
        <StepView step={step} />
      </main>
    </FlowContext>
  );
}

function StepView({ step }: { step: Step }): ReactNode {
  switch (step) {
    case "welcome":
      return <WelcomeStep />;
    case "names":
      return <NamesStep />;
    case "age-1":
      return <AgeStep kidIndex={0} />;
    case "age-2":
      return <AgeStep kidIndex={1} />;
    case "goals":
      return <GoalsStep />;
    case "how":
      return <HowStep />;
    case "after-school":
      return <AfterSchoolStep />;
    case "why":
      return <WhyStep />;
    case "email":
      return <EmailStep />;
    case "received":
      return <ReceivedStep />;
  }
}
