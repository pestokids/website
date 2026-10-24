/**
 * The /apply funnel events (PostHog) and conversions (Linkrunner), built from
 * flow state. Vendor calls go through lib/analytics, which is a no-op unless
 * analytics is enabled.
 *
 * Every flow event carries { step, step_index, kids_count } (+ kid_index on
 * the age screens). sourceType / source / campaign and the first-touch UTMs
 * are registered once as super properties, so PostHog adds them to every event.
 */
import {
  capture,
  identifyApplicant,
  registerSuperProperties,
  trackConversion,
} from "@/lib/analytics";
import {
  classifyAttribution,
  readAttribution,
  type Attribution,
  type Classification,
} from "@/lib/attribution";
import {
  ageKidIndex,
  analyticsStep,
  isAgeStep,
  type Draft,
  type FormStep,
  type Step,
  type Submitted,
} from "./flow";
import type { SubmitResult } from "./submit";

/** Screen number (01–09) by analytics step name. Every age screen is 3. */
const STEP_INDEX: Record<string, number> = {
  welcome: 1,
  names: 2,
  age: 3,
  goals: 4,
  how: 5,
  after_school: 6,
  why: 7,
  email: 8,
  received: 9,
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
] as const;

export type SuggestionKind = "ghost" | "chip" | "typo";
export type SubmitFailure = Extract<SubmitResult, { ok: false }>["reason"];

export function stepProps(step: Step, kidsCount: number) {
  const { step: name, kid_index } = analyticsStep(step);
  return {
    step: name,
    step_index: STEP_INDEX[name],
    kids_count: kidsCount,
    ...(kid_index !== undefined && { kid_index }),
  };
}

export function sourceProps(classification: Classification, attribution: Attribution) {
  const utm = Object.fromEntries(
    UTM_KEYS.flatMap((key) => (attribution[key] ? [[key, attribution[key]]] : [])),
  );
  const { sourceType, source, campaign } = classification;
  return { sourceType, source, campaign, ...utm };
}

/** The part after "@", lowercased. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

/** Extra props for ff_step_completed, by step. */
function completedProps(step: FormStep, draft: Draft) {
  if (isAgeStep(step)) return { age: draft.kids[ageKidIndex(step)]?.age ?? null };
  switch (step) {
    case "goals":
      return { goals: draft.goals };
    case "after-school":
      return { after_school: draft.afterSchool };
    default:
      return {};
  }
}

export const track = {
  /** First load: the draft's first-touch source as super properties. */
  source(draft: Draft) {
    if (!draft.attribution || !draft.sourceType || draft.source === undefined) return;
    const classification: Classification = {
      sourceType: draft.sourceType,
      source: draft.source,
      campaign: draft.campaign ?? null,
    };
    registerSuperProperties(sourceProps(classification, draft.attribution));
  },

  stepViewed(step: Step, kidsCount: number) {
    capture("ff_step_viewed", stepProps(step, kidsCount));
  },

  /** "Count us in". */
  started(draft: Draft) {
    capture("ff_started", stepProps("welcome", draft.kids.length));
    trackConversion("flow_started");
  },

  /** Primary button on names … why. `draft` is the draft after the step's answer is saved. */
  stepCompleted(step: FormStep, draft: Draft) {
    capture("ff_step_completed", {
      ...stepProps(step, draft.kids.length),
      ...completedProps(step, draft),
    });
  },

  emailSuggestionUsed(draft: Draft, email: string, kind: SuggestionKind) {
    capture("ff_email_suggestion_used", {
      ...stepProps("email", draft.kids.length),
      domain: emailDomain(email),
      kind,
    });
  },

  submitted(draft: Draft, submitted: Submitted) {
    capture("ff_submitted", {
      ...stepProps("email", draft.kids.length),
      ages: draft.kids.map((k) => k.age),
      goals: draft.goals,
      after_school: draft.afterSchool,
      email_domain: emailDomain(submitted.email),
    });
    identifyApplicant(submitted.applicationId, submitted.email);
  },

  submitFailed(draft: Draft, reason: SubmitFailure) {
    capture("ff_submit_failed", { ...stepProps("email", draft.kids.length), reason });
  },

  /** Same-tab link to wa.me: sent as a beacon so the navigation can't drop it. */
  whatsappOpened(kidsCount: number) {
    capture("ff_whatsapp_opened", stepProps("received", kidsCount), {
      send_instantly: true,
      transport: "sendBeacon",
    });
  },

  calendarAdded(kidsCount: number) {
    capture("ff_calendar_added", stepProps("received", kidsCount));
  },

  /**
   * The desktop screen keeps no draft, so its source comes straight from the
   * URL. PostHog only: the desktop screen fires no Linkrunner events.
   */
  desktopGateViewed(landingUrl: string, referrer: string) {
    const attribution = readAttribution(landingUrl, referrer);
    registerSuperProperties(sourceProps(classifyAttribution(attribution), attribution));
    capture("ff_desktop_gate_viewed", {});
  },

  desktopLinkCopied() {
    capture("ff_desktop_link_copied", {});
  },
};
