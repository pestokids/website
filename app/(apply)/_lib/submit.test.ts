import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  distinctId: vi.fn<() => string | undefined>(),
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    mutation = mocks.mutation;
  },
}));
vi.mock("@/lib/config", () => ({ config: { convexUrl: "https://test.convex.example" } }));
vi.mock("@/lib/analytics", () => ({ distinctId: mocks.distinctId }));

import { ConvexError } from "convex/values";
import { createDraft, reducer, type Action } from "./flow";
import { submitApplication } from "./submit";

// Obviously fake data only: the repo is public.
const draft = (
  [
    { type: "addKid", name: "Test Kid A" },
    { type: "setAge", kidIndex: 0, age: "5" },
    { type: "toggleGoal", slug: "science" },
    { type: "toggleAfterSchool", slug: "tutors" },
  ] satisfies Action[]
).reduce(reducer, createDraft(0));

beforeEach(() => {
  mocks.mutation.mockReset().mockResolvedValue({ applicationId: "test-id", refCode: "PF-TEST" });
  mocks.distinctId.mockReset();
});

describe("submitApplication", () => {
  it("stores PostHog's distinct ID on the application", async () => {
    mocks.distinctId.mockReturnValue("test-anon-id");
    await submitApplication(draft, "test.parent@example.com");
    expect(mocks.mutation.mock.calls[0][1]).toMatchObject({ posthogDistinctId: "test-anon-id" });
  });

  it("leaves it out when analytics is off", async () => {
    mocks.distinctId.mockReturnValue(undefined);
    await submitApplication(draft, "test.parent@example.com");
    expect(mocks.mutation.mock.calls[0][1]).not.toHaveProperty("posthogDistinctId");
  });

  it("sends the spam-trap field only when it has a value", async () => {
    await submitApplication(draft, "test.parent@example.com");
    expect(mocks.mutation.mock.calls[0][1]).not.toHaveProperty("website");
    await submitApplication(draft, "test.parent@example.com", "https://spam.example.com");
    expect(mocks.mutation.mock.calls[1][1]).toMatchObject({ website: "https://spam.example.com" });
  });

  it.each([
    ["invalid email", "invalid_email"],
    ["disposable email", "disposable_email"],
  ])("maps a server email rejection (%s) to %s", async (reason, expected) => {
    mocks.mutation.mockRejectedValue(new ConvexError({ code: "invalid", field: "email", reason }));
    expect(await submitApplication(draft, "test.parent@example.com")).toEqual({
      ok: false,
      reason: expected,
    });
  });
});
