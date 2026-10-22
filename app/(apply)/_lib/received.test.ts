import { describe, expect, it } from "vitest";
import { receivedDates } from "./received";

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
