"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ageOptions,
  ages,
  email,
  emailDomains,
  emailGhostDomain,
  errors,
  goalOptions,
  goals,
  MAX_GOALS,
  names,
  progress,
  PROGRESS_SEGMENTS,
  type Age,
  type GoalSlug,
} from "@/content/apply";
import {
  PrimaryButton,
  RoundSubmitButton,
  SecondaryButton,
} from "../../_components/ui/button";
import { AgeTile, Chip, SuggestionChip } from "../../_components/ui/chip";
import { FrostedCard } from "../../_components/ui/frosted-card";
import { ArrowRightIcon, LockIcon } from "../../_components/ui/icons";
import { ProgressHeader } from "../../_components/ui/progress-header";
import { TextField } from "../../_components/ui/text-field";

// Fake data only (public repo).
const FAKE_EMAIL = "test.parent@example.com";
const FAKE_TYPO = "test.parent@gmial.com";
const FAKE_FIX = "test.parent@gmail.com";
const FAKE_LONG = "test.parent.with.a.long.address@example.com";

const noop = () => {};

export function Kit() {
  return (
    <div className="flex flex-col gap-10 pb-16">
      <div className="px-[var(--margin-page)] pt-6">
        <p className="text-xs font-bold tracking-[0.8px] text-muted uppercase">Internal · not in production</p>
        <h1 className="font-display text-[28px] leading-8 font-extrabold">Component kit</h1>
        <p className="mt-1 text-[13px] text-muted">
          Shared /apply components in every state. Sticky footer above the keyboard:{" "}
          <Link href="/apply/_kit/footer" className="font-semibold text-forest underline">
            open the footer demo
          </Link>{" "}
          on a phone.
        </p>
      </div>

      <Section title="Progress header">
        <div className="-mx-[var(--margin-page)] flex flex-col gap-1">
          {[1, 2, 4, 7].map((n) => (
            <ProgressHeader
              key={n}
              current={n}
              total={PROGRESS_SEGMENTS}
              label={progress.label(n)}
              backLabel={progress.back}
              onBack={noop}
            />
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <Label>Primary · enabled / disabled</Label>
        <PrimaryButton>{goals.confirm}</PrimaryButton>
        <PrimaryButton disabled>{goals.pick}</PrimaryButton>
        <Label>Secondary · enabled / disabled</Label>
        <SecondaryButton>{names.addAnother}</SecondaryButton>
        <SecondaryButton disabled>{names.addAnother}</SecondaryButton>
        <Label>Inline pair (names, keyboard up)</Label>
        <div className="flex gap-3">
          <SecondaryButton className="flex-1">{names.addAnother}</SecondaryButton>
          <PrimaryButton className="w-[120px]">{names.next}</PrimaryButton>
        </div>
        <Label>Round submit · enabled / disabled / busy (tap the first one)</Label>
        <RoundSubmitDemo />
      </Section>

      <Section title="Chips">
        <Label>Unselected / selected / disabled</Label>
        <div className="flex flex-wrap gap-2">
          <Chip pressed={false} icon="heart">being kind</Chip>
          <Chip pressed icon="diya">our stories</Chip>
          <Chip pressed={false} icon="puzzle" disabled>puzzles</Chip>
          <Chip pressed={false}>no icon</Chip>
        </div>
        <Label>Interactive · max {MAX_GOALS}, others disable at the cap</Label>
        <GoalsDemo />
        <Label>Suggestion chips · rest / highlighted / fix</Label>
        <div className="flex flex-wrap gap-2">
          {emailDomains.map((d, i) => (
            <SuggestionChip key={d} highlighted={i === 0}>
              @{d}
            </SuggestionChip>
          ))}
          <SuggestionChip highlighted>
            {FAKE_FIX} <ArrowRightIcon size={16} />
          </SuggestionChip>
        </div>
      </Section>

      <Section title="Age tiles">
        <Label>Unselected (solid white) / selected (lime + check)</Label>
        <AgeDemo />
      </Section>

      <Section title="Text field">
        <FieldDemos />
      </Section>

      <Section title="Frosted card">
        <Label>backdrop-filter (over colour) / forced fallback</Label>
        <div className="relative grid gap-4 overflow-hidden rounded-card-lg p-3">
          <div aria-hidden="true" className="absolute top-2 right-6 size-28 rounded-full bg-[#b8f03a]/60 blur-2xl" />
          <div aria-hidden="true" className="absolute bottom-4 left-4 size-28 rounded-full bg-[#ffb27a]/50 blur-2xl" />
          <FrostedCard className="relative p-5">
            <CardBody note="Blurred where supported, white/90% otherwise." />
          </FrostedCard>
          <FrostedCard solid className="relative p-5">
            <CardBody note="Fallback: solid white/90%." />
          </FrostedCard>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 px-[var(--margin-page)]">
      <h2 className="border-b border-hairline pb-1 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs font-bold tracking-[0.8px] text-muted uppercase">{children}</p>;
}

function RoundSubmitDemo() {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);

  const submit = () => {
    setCount((c) => c + 1);
    setBusy(true);
    setTimeout(() => setBusy(false), 2000);
  };

  return (
    <div className="flex items-center gap-4">
      <RoundSubmitButton aria-label={email.submitLabel} busy={busy} onClick={submit} />
      <RoundSubmitButton aria-label={email.submitLabel} disabled />
      <RoundSubmitButton aria-label={email.submitLabel} busy />
      <p className="text-[13px] text-muted">Submits: {count}</p>
    </div>
  );
}

function GoalsDemo() {
  const [picked, setPicked] = useState<GoalSlug[]>(["our_stories", "science"]);
  const full = picked.length >= MAX_GOALS;
  const toggle = (slug: GoalSlug) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : full ? p : [...p, slug]));

  return (
    <div role="group" aria-label="Goals demo" className="flex flex-wrap gap-2">
      {goalOptions.map((o) => {
        const on = picked.includes(o.slug);
        return (
          <Chip
            key={o.slug}
            icon={o.icon}
            pressed={on}
            disabled={full && !on}
            onClick={() => toggle(o.slug)}
          >
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}

function AgeDemo() {
  const [age, setAge] = useState<Age | null>("5");
  return (
    <div role="group" aria-label={ages.question("Meera")} className="grid grid-cols-3 gap-3">
      {ageOptions.map((a) => (
        <AgeTile key={a} unit={ages.unit} pressed={age === a} onClick={() => setAge(a)}>
          {a}
        </AgeTile>
      ))}
    </div>
  );
}

function FieldDemos() {
  const [name, setName] = useState("");
  const [typed, setTyped] = useState("Meera");
  const [bad, setBad] = useState("Meera2");
  const [ghosted, setGhosted] = useState("test.parent");
  const [typo, setTypo] = useState(FAKE_TYPO);

  return (
    <div className="flex flex-col gap-5">
      <TextField
        label="Rest · empty (tap to see focus)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onClear={() => setName("")}
        clearLabel={names.clear}
        placeholder={names.placeholder}
        autoCapitalize="words"
        autoComplete="off"
      />
      <TextField
        label="With text · clear ×"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onClear={() => setTyped("")}
        clearLabel={names.clear}
        autoComplete="off"
      />
      <TextField
        label="Error (announced)"
        value={bad}
        onChange={(e) => setBad(e.target.value)}
        onClear={() => setBad("")}
        clearLabel={names.clear}
        error={/^[\p{L}\s'’-]*$/u.test(bad) ? undefined : errors.nameInvalid}
        autoComplete="off"
      />
      <div className="flex flex-col gap-2">
        <TextField
          label={`${email.label} · invalid with fix`}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={typo}
          onChange={(e) => setTypo(e.target.value)}
          error={typo === FAKE_TYPO ? errors.emailInvalid : undefined}
          valid={typo === FAKE_FIX}
        />
        {typo === FAKE_TYPO && (
          <SuggestionChip highlighted className="self-start" onClick={() => setTypo(FAKE_FIX)}>
            {email.suggestion(FAKE_FIX)}
          </SuggestionChip>
        )}
      </div>
      <TextField
        label={`${email.label} · ghost completion`}
        type="email"
        inputMode="email"
        autoComplete="off"
        value={ghosted}
        onChange={(e) => setGhosted(e.target.value)}
        ghost={ghosted && !ghosted.includes("@") ? `@${emailGhostDomain}` : undefined}
      />
      <TextField
        label={`${email.label} · valid`}
        type="email"
        value={FAKE_EMAIL}
        onChange={noop}
        valid
        hint={<Privacy />}
      />
      <TextField
        label={`${email.label} · long address, valid`}
        type="email"
        value={FAKE_LONG}
        onChange={noop}
        valid
      />
      <TextField
        label={`${email.label} · read-only (submitting)`}
        type="email"
        value={FAKE_EMAIL}
        readOnly
        valid
        hint={<Privacy />}
      />
    </div>
  );
}

function Privacy() {
  return (
    <>
      <LockIcon />
      {email.privacy}
    </>
  );
}

function CardBody({ note }: { note: string }) {
  return (
    <>
      <p className="text-xs font-bold tracking-[0.8px] text-lime-deep">{ages.eyebrow}</p>
      <p className="font-display text-[26px] leading-8 font-extrabold">{ages.question("Meera")}</p>
      <p className="mt-1 text-[13px] text-muted">{note}</p>
    </>
  );
}
