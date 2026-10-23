import { describe, expect, it } from "vitest";
import { googleCalendarLink } from "./calendar";

describe("googleCalendarLink", () => {
  it("builds an all-day template event ending the next day", () => {
    const url = new URL(googleCalendarLink("Pesto beta day", "2026-10-31"));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Pesto beta day");
    expect(url.searchParams.get("dates")).toBe("20261031/20261101");
  });

  it("rolls over months and years", () => {
    const dates = (iso: string) => new URL(googleCalendarLink("x", iso)).searchParams.get("dates");
    expect(dates("2026-11-30")).toBe("20261130/20261201");
    expect(dates("2026-12-31")).toBe("20261231/20270101");
  });
});
