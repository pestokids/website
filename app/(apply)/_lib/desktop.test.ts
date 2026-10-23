import { describe, expect, it } from "vitest";
import { handoffUrl, isDesktop } from "./desktop";

describe("isDesktop", () => {
  const laptop = { maxTouchPoints: 0, finePointer: true, width: 1440 };

  it("is true for a laptop at 1440", () => {
    expect(isDesktop(laptop)).toBe(true);
  });

  it("starts at 1024 wide", () => {
    expect(isDesktop({ ...laptop, width: 1024 })).toBe(true);
    expect(isDesktop({ ...laptop, width: 1023 })).toBe(false);
    expect(isDesktop({ ...laptop, width: 984 })).toBe(false);
  });

  it("is false with touch points (iPad, touch laptops) or a coarse pointer", () => {
    expect(isDesktop({ ...laptop, maxTouchPoints: 5 })).toBe(false);
    expect(isDesktop({ ...laptop, finePointer: false })).toBe(false);
  });
});

describe("handoffUrl", () => {
  it("keeps the tracked params and adds via=desktop", () => {
    const url = new URL(
      handoffUrl(
        "https://pestokids.com/apply?utm_source=meta&utm_medium=paid_social&utm_campaign=test&utm_id=123&fbclid=abc",
      ),
    );
    expect(url.origin + url.pathname).toBe("https://pestokids.com/apply");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "test",
      utm_id: "123",
      fbclid: "abc",
      via: "desktop",
    });
  });

  it("works on a bare link", () => {
    expect(handoffUrl("https://pestokids.com/apply")).toBe("https://pestokids.com/apply?via=desktop");
  });

  it("keeps only tracked params, replaces via and drops the hash", () => {
    expect(
      handoffUrl(
        "https://pestokids.com/apply?step=goals&utm_source=whatsapp&foo=bar&ttclid=t1&gclid=&via=x#top",
      ),
    ).toBe("https://pestokids.com/apply?utm_source=whatsapp&ttclid=t1&via=desktop");
  });
});
