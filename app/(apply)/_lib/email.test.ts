import { describe, expect, it } from "vitest";
import {
  completeWith,
  domainTypo,
  editDistance,
  emailSuggestion,
  ghostDomain,
  ghostText,
  isEmailFormatValid,
} from "./email";

describe("ghost completion", () => {
  it("offers @gmail.com while only the local part is typed", () => {
    expect(ghostText("priya")).toBe("@gmail.com");
    expect(ghostDomain("priya")).toBe("gmail.com");
  });

  it("offers the picked domain instead of gmail", () => {
    expect(ghostText("priya", "icloud.com")).toBe("@icloud.com");
  });

  it("completes the rest of the domain after @", () => {
    expect(ghostText("priya@")).toBe("gmail.com");
    expect(ghostText("priya@ic")).toBe("loud.com");
    expect(ghostText("priya@GM")).toBe("ail.com");
    expect(ghostText("priya@gmail.co")).toBe("m");
  });

  it("stays out of the way once the domain is complete or unknown", () => {
    expect(ghostText("")).toBeNull();
    expect(ghostText("priya@gmail.com")).toBeNull();
    expect(ghostText("priya@example.org")).toBeNull();
    expect(ghostText("@gm")).toBeNull();
    expect(ghostText("pri ya")).toBeNull();
    expect(ghostText("a@b@gm")).toBeNull();
  });
});

describe("completeWith", () => {
  it("replaces whatever follows the local part", () => {
    expect(completeWith("priya", "gmail.com")).toBe("priya@gmail.com");
    expect(completeWith("priya@gm", "icloud.com")).toBe("priya@icloud.com");
    expect(completeWith(" priya ", "yahoo.com")).toBe("priya@yahoo.com");
  });
});

describe("editDistance", () => {
  it("counts a swap of neighbours as one edit", () => {
    expect(editDistance("gmial", "gmail")).toBe(1);
    expect(editDistance("gamil", "gmail")).toBe(1);
    expect(editDistance("gmail", "gmail")).toBe(0);
    expect(editDistance("", "com")).toBe(3);
  });
});

describe("domainTypo", () => {
  it.each([
    ["gmial.com", "gmail.com"],
    ["gmai.com", "gmail.com"],
    ["gmail.con", "gmail.com"],
    ["gmail.co", "gmail.com"],
    ["gmial.con", "gmail.com"],
    ["gmailcom", "gmail.com"],
    ["gmail", "gmail.com"],
    ["yahooo.com", "yahoo.com"],
    ["yaho.com", "yahoo.com"],
    ["iclod.com", "icloud.com"],
    ["outlok.com", "outlook.com"],
    ["hotmial.com", "hotmail.com"],
    ["hotmai.cmo", "hotmail.com"],
    ["yahooo.co.in", "yahoo.co.in"],
  ])("%s → %s", (typed, fixed) => {
    expect(domainTypo(typed)).toBe(fixed);
  });

  it.each([
    "gmail.com",
    "yahoo.ca",
    "yahoo.co.in",
    "hotmail.co.uk",
    "ymail.com",
    "mail.com",
    "example.com",
    "mail.yahoo.com",
    "company.org",
  ])("leaves %s alone", (domain) => {
    expect(domainTypo(domain)).toBeNull();
  });
});

describe("emailSuggestion", () => {
  it("suggests the ghost completion for a local part or half-typed domain", () => {
    expect(emailSuggestion("priya")).toBe("priya@gmail.com");
    expect(emailSuggestion("priya@")).toBe("priya@gmail.com");
    expect(emailSuggestion("priya@ic")).toBe("priya@icloud.com");
  });

  it("fixes a typo of a common domain, lowercased and trimmed", () => {
    expect(emailSuggestion("priya@gmial.com")).toBe("priya@gmail.com");
    expect(emailSuggestion(" Priya@Gmail.con ")).toBe("priya@gmail.com");
  });

  it("has nothing to say about fine or hopeless addresses", () => {
    expect(emailSuggestion("priya@gmail.com")).toBeNull();
    expect(emailSuggestion("test.parent@example.com")).toBeNull();
    expect(emailSuggestion("")).toBeNull();
    expect(emailSuggestion("@gmail.com")).toBeNull();
    expect(emailSuggestion("a@b@c.com")).toBeNull();
  });
});

describe("isEmailFormatValid", () => {
  it("uses the shared rule on the normalised value", () => {
    expect(isEmailFormatValid(" Test.Parent@Example.com ")).toBe(true);
    expect(isEmailFormatValid("priya")).toBe(false);
    expect(isEmailFormatValid("priya@gmail")).toBe(false);
  });
});
