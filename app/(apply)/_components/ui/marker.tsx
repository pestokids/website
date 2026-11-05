import { Fragment, type CSSProperties, type ReactNode } from "react";
import { day } from "../classes";

/**
 * Soft lime highlight behind a word (kids' names in headings, "storybook" on
 * welcome): #d9f78a on the lower 42% of the line, 6px corners. It sweeps in
 * left to right once, `delay` seconds after the screen appears; under reduced
 * motion it's already drawn.
 */
export function Marker({ children, delay = 0.35 }: { children: ReactNode; delay?: number }) {
  return (
    <span className={day.marker} style={{ "--marker-delay": `${delay}s` } as CSSProperties}>
      {children}
    </span>
  );
}

/**
 * `text` with the kids' names marked: "How old is [Meera]?", "You’re in the
 * running, [Meera] & [Arjun]!". The names, and whatever follows them up to
 * the next space ("Meera & Arjun!"), never split across lines: the line
 * breaks before them instead. `names` are joined with " & ", as in the copy.
 */
export function MarkedNames({ text, names }: { text: string; names: readonly string[] }) {
  const joined = names.join(" & ");
  const at = text.lastIndexOf(joined);
  if (!joined || at === -1) return text;
  const after = text.slice(at + joined.length);
  const space = after.search(/\s/);
  const glued = space === -1 ? after : after.slice(0, space);
  const rest = space === -1 ? "" : after.slice(space);
  return (
    <>
      {text.slice(0, at)}
      <span className="whitespace-nowrap">
        {names.map((name, i) => (
          <Fragment key={name}>
            {i > 0 && " & "}
            <Marker>{name}</Marker>
          </Fragment>
        ))}
        {glued}
      </span>
      {rest}
    </>
  );
}
