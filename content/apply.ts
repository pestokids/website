/**
 * All copy, option lists and numbers for the Founding Families flow (/apply).
 * Components import from here; nothing user-facing is hard-coded in them.
 *
 * Personalised strings are functions. They take a `Family` (built by
 * app/(apply)/_lib/personalise.ts) so 1-kid and 2-kid wording lives here.
 */

/** Names of the kids, already joined and possessive-ised for display. */
export type Family = {
  /** Display names in order, 1 or 2. */
  kidNames: string[];
  /** "Meera" or "Meera & Arjun". */
  names: string;
  /** "Meera’s" (1 kid). With 2 kids the copy uses "their" instead. */
  possessive: string;
  /** True with 2 kids. */
  plural: boolean;
};

/** Icon file names in /public/icons/{sm,md,lg}/{icon}.svg */
export type IconName =
  | "book"
  | "bow"
  | "bubble"
  | "deer"
  | "dice"
  | "diya"
  | "globe"
  | "grandma"
  | "heart"
  | "moon"
  | "note"
  | "palette"
  | "pencil"
  | "phone"
  | "puzzle"
  | "question"
  | "school"
  | "sprout"
  | "telescope"
  | "tv";

export type Option<Slug extends string> = { slug: Slug; label: string; icon: IconName };

export const MAX_KIDS = 2;
export const MAX_GOALS = 3;
export const NAME_MAX_LENGTH = 30;
export const PROGRESS_SEGMENTS = 7;

export const familyCountCopy = "100 families";

export const ageOptions = ["3", "4", "5", "6", "7", "8+"] as const;
export type Age = (typeof ageOptions)[number];

export const goalOptions = [
  { slug: "our_stories", label: "our stories", icon: "diya" },
  { slug: "science", label: "science", icon: "telescope" },
  { slug: "being_kind", label: "being kind", icon: "heart" },
  { slug: "music", label: "music", icon: "note" },
  { slug: "puzzles", label: "puzzles", icon: "puzzle" },
  { slug: "the_world", label: "the world", icon: "globe" },
  { slug: "new_words", label: "new words", icon: "bubble" },
  { slug: "making_things", label: "making things", icon: "palette" },
] as const satisfies readonly Option<string>[];
export type GoalSlug = (typeof goalOptions)[number]["slug"];

export const afterSchoolOptions = [
  { slug: "youtube_cartoons", label: "YouTube & cartoons", icon: "tv" },
  { slug: "bal_vihar", label: "Bal Vihar", icon: "school" },
  { slug: "learning_apps", label: "Learning apps", icon: "phone" },
  { slug: "bedtime_stories", label: "Bedtime stories", icon: "book" },
  { slug: "grandparents", label: "Grandparents", icon: "grandma" },
  { slug: "tutors", label: "Tutors", icon: "pencil" },
  { slug: "music_art_sports", label: "Music, art or sports", icon: "palette" },
  { slug: "mostly_school", label: "Mostly just school", icon: "sprout" },
] as const satisfies readonly Option<string>[];
export type AfterSchoolSlug = (typeof afterSchoolOptions)[number]["slug"];
/** Can't be picked together with any other after-school option. */
export const EXCLUSIVE_AFTER_SCHOOL = "mostly_school" satisfies AfterSchoolSlug;

/** Domain chips on the email screen, in display order. */
export const emailDomains = ["gmail.com", "icloud.com", "yahoo.com", "outlook.com"] as const;
/** Ghost completion shown while only the local part is typed. */
export const emailGhostDomain = "gmail.com";
/** Domains checked for typos (mailcheck-style). */
export const emailTypoDomains = [
  "gmail.com",
  "yahoo.com",
  "icloud.com",
  "outlook.com",
  "hotmail.com",
] as const;
/** Real domains that look like typos of the ones above. Never flagged. */
export const emailKnownDomains = [
  "ymail.com",
  "mail.com",
  "email.com",
  "gmx.com",
  "cloud.com",
  "googlemail.com",
  "rocketmail.com",
] as const;

/** WhatsApp prefill. `{ref}` is the application's ref code. */
export const whatsappPrefill = "Hi Pesto! 👋 ({ref})";
export const whatsappPrefillFor = (refCode: string) => whatsappPrefill.replace("{ref}", refCode);

export const errors = {
  nameInvalid: "Just letters, please.",
  nameTooLong: `That’s a long one! ${NAME_MAX_LENGTH} letters max.`,
  nameDuplicate: "You’ve already added that name.",
  emailInvalid: "Hmm, that doesn’t look right. Did you mean",
  /** Same, when there's nothing to suggest. */
  emailInvalidPlain: "Hmm, that doesn’t look right.",
  /** A throwaway-inbox domain (lib/disposable-email.ts). */
  emailDisposable: "That looks like a temporary inbox. Use one you’ll check, so your letter finds you.",
  network: "Couldn’t send that. Check your connection and try again.",
} as const;

export const meta = {
  title: "Pesto Founding Families",
  description:
    "Early access to Pesto, the playful learning app for kids 3–8. 100 families. Apply in 3 minutes.",
  url: "https://pestokids.com/apply",
  siteName: "Pesto",
} as const;

export const welcome = {
  headline: ["For kids", "who ask", "why?"],
  stickers: ["diya", "moon", "bow", "deer"] satisfies IconName[],
  cta: "Count us in",
  footer: (admissionsCloseShort: string) =>
    `3 minutes · ${familyCountCopy} · Admissions close ${admissionsCloseShort}`,
} as const;

export const progress = {
  back: "Back",
  label: (step: number) => `Step ${step} of ${PROGRESS_SEGMENTS}`,
} as const;

export const names = {
  headline: ["Who’s joining the", "adventure?"],
  labelFirst: "First kid’s name",
  labelSecond: "Second kid’s name",
  placeholder: "e.g. Meera",
  clear: "Clear name",
  addAnother: "+ Add another kid",
  next: "Next ›",
  reviewLabel: "Your kids",
  remove: (name: string) => `Remove ${name}`,
  capNote: `Founding Families is for up to ${MAX_KIDS} kids per family.`,
} as const;

export const ages = {
  eyebrow: "PESTO ASKS",
  eyebrowSecond: (firstKid: string, firstAge: Age) =>
    `PESTO ASKS · ${firstKid.toUpperCase()} IS ${firstAge} ✓`,
  question: (kid: string) => `How old is ${kid}?`,
  questionSecond: (kid: string) => `And how old is ${kid}?`,
  unit: "years",
  hint: "Tap the age that fits.",
  pick: "Pick an age",
  confirm: (kid: string) => `That’s ${kid}!`,
} as const;

export const goals = {
  sentence: (family: Family) => [`I want ${family.names}`, "to fall in love with…"],
  emptySlot: "tap a word below",
  moreSlot: "one more?",
  joiner: "and",
  pickLabel: "TAP TO DROP IT IN",
  counter: (n: number) => `${n} OF ${MAX_GOALS}`,
  pick: "Pick at least one",
  confirm: "That’s us",
} as const;

export const how = {
  lines: ["Play.", "Play.", "Play.", "Learn."],
  aside: "(they won’t even notice)",
  sub: (family: Family) =>
    `Pesto is fun first. To ${family.names} it’s just playtime. The learning sneaks in along the way.`,
  trail: [
    { label: "Stories", icon: "book" },
    { label: "Questions", icon: "bubble" },
    { label: "Games", icon: "dice" },
  ] satisfies { label: string; icon: IconName }[],
  cta: "Continue",
} as const;

export const afterSchool = {
  headline: (family: Family) =>
    family.plural
      ? "After school, what keeps their brains busy?"
      : `After school, what keeps ${family.possessive} brain busy?`,
  sub: "Tap everything that fits.",
  pick: "Pick at least one",
  confirm: "That’s their week",
  /** Shown under the chips when "Mostly just school" clears the others. */
  cleared: "Got it, just school. We cleared the others.",
} as const;

export const why = {
  headline: ["Kids learn most when", "they play along."],
  sub: "Harvard-led research shows active learning, where kids play along and talk back, beats passive watching.",
  /** Rank 1 shows the Pesto badge; the others show `icon` on a white tile. */
  podium: [
    { rank: 1, label: "Played along", tag: "ACTIVE", icon: null },
    { rank: 2, label: "Answered sometimes", tag: null, icon: "bubble" },
    { rank: 3, label: "Just watched", tag: "PASSIVE", icon: "tv" },
  ] satisfies { rank: number; label: string; tag: string | null; icon: IconName | null }[],
  /** Starburst seal: a big figure over a two-line caption ("3× BETTER OUTCOMES"). */
  seal: { figure: "3×", caption: ["BETTER", "OUTCOMES"] },
  cta: "Continue",
} as const;

export const email = {
  headline: ["Where should we send your", "Founding Family letter?"],
  label: "Email",
  placeholder: "you@email.com",
  lastStep: "Last step!",
  sending: "Sending…",
  sub: {
    empty: "Enter your email to submit",
    typing: "Finish your email to submit",
    invalid: "Fix your email to submit",
    ready: "Submit your application",
    submitting: "Sealing your application",
  },
  suggestion: (suggested: string) => `${suggested} →`,
  domainChip: (domain: string) => `@${domain}`,
  domainChipsLabel: "Email domains",
  /** Shown after a lock icon (not an emoji). */
  privacy: "Only used for your application. Never shared.",
  submitLabel: "Submit application",
  /** Spam trap: an off-screen field people never see. Bots that fill it are ignored. */
  honeypotLabel: "Leave this empty",
} as const;

export const received = {
  title: (family: Family) => `You’re in the running, ${family.names}!`,
  meta: (todayShort: string) => `Application received · ${todayShort}`,
  nextTitle: "What happens next",
  doneCount: "1 of 4 done",
  sent: { title: "Application sent", sub: "Just now" },
  sayHi: {
    eyebrow: "NOW",
    title: "Say hi to Pesto",
    sub: (family: Family) => `He’ll send a 2-minute story for ${family.names} to try tonight.`,
    chatName: "Pesto",
    chatMessage: (family: Family) => `Hi ${family.names}! Story time tonight?`,
    chatTime: "8:02 PM",
    cta: "Open WhatsApp",
  },
  letter: { title: "Your Founding Family letter", sub: "In your inbox within 48 hours" },
  betaDay: {
    title: "Beta day",
    cta: "+ Calendar",
    calendarTitle: "Pesto beta day",
  },
  footer: (emailAddress: string) => `A copy of your application is on its way to ${emailAddress}`,
} as const;

export const desktop = {
  eyebrow: "FOUNDING FAMILIES",
  headline: ["Let’s continue on", "your phone."],
  sub: "Pesto is built for the screens your kids play on. Scan the code and you’ll be done in about 3 minutes.",
  linkLabel: "pestokids.com/apply",
  copy: "Copy link",
  copied: "Copied!",
  qrCaption: "Point your phone camera here",
  qrSub: "Opens in your phone’s browser",
  qrLabel: "QR code for this page",
  stickers: ["diya", "moon", "bow", "deer"] satisfies IconName[],
} as const;
