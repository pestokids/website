import { describe, expect, it } from "vitest";
import { readAttribution } from "./attribution";
import {
  FIRST_TOUCH_KEY,
  hasSource,
  loadFirstTouch,
  saveFirstTouch,
  type KeyValueStorage,
} from "./first-touch";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const HOME = "https://pestokids.com/";
const visit = (query: string, referrer = "") => readAttribution(`${HOME}${query}`, referrer);

describe("hasSource", () => {
  it.each([
    ["a UTM", visit("?utm_source=whatsapp")],
    ["a click ID", visit("?gclid=test-gclid")],
    ["a UTM with via", visit("?utm_source=whatsapp&via=inv-test")],
    ["a utm_campaign alone", visit("?utm_campaign=test")],
    ["an external referrer", visit("", "https://www.instagram.com/")],
    ["an AI referrer", visit("", "https://chatgpt.com/")],
  ])("true for %s", (_, a) => {
    expect(hasSource(a)).toBe(true);
  });

  it.each([
    ["a typed URL", visit("")],
    ["other params only", visit("?step=email&ref=x")],
    ["via alone (an investor link)", visit("?via=inv-test")],
    ["a same-site referrer", visit("", "https://pestokids.com/privacy")],
  ])("false for %s", (_, a) => {
    expect(hasSource(a)).toBe(false);
  });
});

describe("first touch", () => {
  it("saves a landing visit with UTMs and click IDs, and loads it back", () => {
    const storage = memoryStorage();
    const a = visit("?utm_source=meta&utm_medium=paid_social&fbclid=test-fbclid", "https://l.facebook.com/");
    expect(saveFirstTouch(a, storage)).toBe(true);
    expect(loadFirstTouch(storage)).toEqual(a);
  });

  it("never overwrites an earlier first touch", () => {
    const storage = memoryStorage();
    const first = visit("?utm_source=whatsapp&utm_id=wa-test");
    saveFirstTouch(first, storage);
    expect(saveFirstTouch(visit("?gclid=test-gclid"), storage)).toBe(false);
    expect(saveFirstTouch(visit("", "https://chatgpt.com/"), storage)).toBe(false);
    expect(loadFirstTouch(storage)).toEqual(first);
  });

  it("doesn't save a visit with no source, so a later one with a source still counts", () => {
    const storage = memoryStorage();
    expect(saveFirstTouch(visit(""), storage)).toBe(false);
    expect(saveFirstTouch(visit("?via=inv-test"), storage)).toBe(false);
    expect(storage.data).toEqual({});
    const later = visit("?utm_source=instagram_bio");
    expect(saveFirstTouch(later, storage)).toBe(true);
    expect(loadFirstTouch(storage)).toEqual(later);
  });

  it("returns null when nothing is saved or storage is unavailable", () => {
    expect(loadFirstTouch(memoryStorage())).toBeNull();
    expect(loadFirstTouch(null)).toBeNull();
    expect(saveFirstTouch(visit("?utm_source=x"), null)).toBe(false);
  });

  it("ignores storage that throws", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(saveFirstTouch(visit("?utm_source=x"), broken)).toBe(false);
    expect(loadFirstTouch(broken)).toBeNull();
  });

  it("treats storage as untrusted: bad JSON, unknown keys, non-strings", () => {
    expect(loadFirstTouch(memoryStorage({ [FIRST_TOUCH_KEY]: "{not json" }))).toBeNull();
    expect(loadFirstTouch(memoryStorage({ [FIRST_TOUCH_KEY]: '"a string"' }))).toBeNull();
    const stored = JSON.stringify({
      utm_source: " whatsapp ",
      utm_medium: 3,
      evil: "x",
      referrer: "",
    });
    expect(loadFirstTouch(memoryStorage({ [FIRST_TOUCH_KEY]: stored }))).toEqual({
      utm_source: "whatsapp",
    });
    expect(loadFirstTouch(memoryStorage({ [FIRST_TOUCH_KEY]: '{"evil":"x"}' }))).toBeNull();
  });
});
