import { describe, expect, it } from "vitest";
import { received } from "@/content/apply";
import { parseIsoDate } from "@/lib/dates";
import { nextSteps, receivedDates } from "./received";

const submittedAt = new Date(2026, 9, 21, 20, 0).getTime();
const later = (minutes: number) => new Date(submittedAt + minutes * 60_000);

describe("receivedDates", () => {
  it("says Just now within an hour of submitting", () => {
    expect(receivedDates(submittedAt, later(0))).toEqual({ receivedOn: "Oct 21", sentWhen: "Just now" });
    expect(receivedDates(submittedAt, later(59)).sentWhen).toBe("Just now");
  });

  it("shows the submit date after an hour, also on later days", () => {
    expect(receivedDates(submittedAt, later(60)).sentWhen).toBe("Oct 21");
    expect(receivedDates(submittedAt, later(3 * 24 * 60))).toEqual({
      receivedOn: "Oct 21",
      sentWhen: "Oct 21",
    });
  });

  it("treats a record without a submit time as just submitted", () => {
    expect(receivedDates(undefined, later(0))).toEqual({ receivedOn: "Oct 21", sentWhen: "Just now" });
  });
});

describe("nextSteps", () => {
  it("has 4 steps, the last being the beta day, when it's set", () => {
    const steps = nextSteps(parseIsoDate("2026-10-31"));
    expect(steps).toEqual({ total: 4, betaDay: true });
    expect(received.doneCount(steps.total)).toBe("1 of 4 done");
  });

  it("drops the beta day and counts 3 when it isn't set", () => {
    const steps = nextSteps(null);
    expect(steps).toEqual({ total: 3, betaDay: false });
    expect(received.doneCount(steps.total)).toBe("1 of 3 done");
  });
});
