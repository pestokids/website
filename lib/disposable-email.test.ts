import { describe, expect, it } from "vitest";
import { disposableEmailDomains, isDisposableEmail } from "./disposable-email";

describe("isDisposableEmail", () => {
  it.each([
    "test.parent@mailinator.com",
    "test.parent@yopmail.fr",
    "test.parent@eu.mailinator.com",
    "Test.Parent@GuerrillaMail.com",
  ])("blocks %s", (email) => {
    expect(isDisposableEmail(email)).toBe(true);
  });

  it.each([
    "test.parent@gmail.com",
    "test.parent@example.com",
    // Privacy relays forward to a real inbox.
    "test.parent@privaterelay.appleid.com",
    "test.parent@duck.com",
    // Only whole labels match.
    "test.parent@notyopmail.com",
    "test.parent@mailinator.com.example.com",
  ])("allows %s", (email) => {
    expect(isDisposableEmail(email)).toBe(false);
  });

  it("lists lowercase domains with no repeats", () => {
    for (const domain of disposableEmailDomains) expect(domain).toBe(domain.toLowerCase());
    expect(new Set(disposableEmailDomains).size).toBe(disposableEmailDomains.length);
  });
});
