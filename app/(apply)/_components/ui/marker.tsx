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

const NBSP = "\u00a0";

/**
 * `text` with the kids' names marked: "How old is [Meera]?", "You’re in the
 * running, [Meera] & [Arjun]!". The names, and whatever follows them up to
 * the next space ("Meera & Arjun!"), stay together on one line: the line
 * breaks before them instead. Only when they can't fit on a line of their own
 * (two long names on a narrow phone) does the phrase break, after the "&":
 * never inside a name, and never between the last name and what follows it.
 * `names` are joined with " & ", as in the copy.
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
      {/*
        Each name and what follows it ("Meera &", "Arjun!") is a nowrap piece,
        joined by a no-break space: no normal break opportunity anywhere, so
        the phrase lays out exactly like one nowrap span. overflow-wrap only
        lets it break at that space, when it doesn't fit on a line of its own.
      */}
      <span className="[overflow-wrap:anywhere]">
        {names.map((name, i) => (
          <Fragment key={name}>
            {i > 0 && NBSP}
            <span className="whitespace-nowrap">
              <Marker>{name}</Marker>
              {i < names.length - 1 ? `${NBSP}&` : glued}
            </span>
          </Fragment>
        ))}
      </span>
      {rest}
    </>
  );
}
