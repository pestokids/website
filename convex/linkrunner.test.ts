// @vitest-environment edge-runtime
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CAPTURE_EVENT_URL, linkrunnerServerKey, signupEvent } from "./linkrunner";
import { setupConvex, submit } from "./test.setup";

// Obviously fake data only: the repo is public.
const application = {
  kids: [{ name: "Test Kid A", age: "5" }],
  goals: ["science"],
  afterSchool: ["tutors"],
  email: "test.parent@example.com",
  attribution: {},
};

/** Calls to Linkrunner (the email send is off, so it's the only fetch). */
function linkrunnerCalls(fetchSpy: ReturnType<typeof vi.fn>) {
  return fetchSpy.mock.calls.filter(([url]) => url === CAPTURE_EVENT_URL);
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("EMAIL_SEND_ENABLED", "");
  fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("linkrunnerServerKey", () => {
  it("is null when unset or blank", () => {
    expect(linkrunnerServerKey(undefined)).toBeNull();
    expect(linkrunnerServerKey("  ")).toBeNull();
    expect(linkrunnerServerKey(" test-key ")).toBe("test-key");
  });
});

describe("signup mirror", () => {
  it("is off without LINKRUNNER_SERVER_KEY", async () => {
    vi.stubEnv("LINKRUNNER_SERVER_KEY", "");
    const t = setupConvex();
    await submit(t, application);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(linkrunnerCalls(fetchSpy)).toHaveLength(0);
  });

  it("posts a web signup keyed by the application ID, once per application", async () => {
    vi.stubEnv("LINKRUNNER_SERVER_KEY", "test-linkrunner-key");
    const t = setupConvex();
    const { applicationId } = await submit(t, application);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    // A repeat from the same email updates the application but isn't a new signup.
    await submit(t, application);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const calls = linkrunnerCalls(fetchSpy);
    expect(calls).toHaveLength(1);
    const init = calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "linkrunner-key": "test-linkrunner-key",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      event_name: "signup",
      user_id: applicationId,
      event_id: applicationId,
      source: "web",
    });
    expect(signupEvent(applicationId)).toEqual(JSON.parse(init.body as string));
  });

  it("logs a failure without retrying or failing the submit", async () => {
    vi.stubEnv("LINKRUNNER_SERVER_KEY", "test-linkrunner-key");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchSpy.mockResolvedValue(new Response("", { status: 500 }));
    const t = setupConvex();
    await submit(t, application);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(linkrunnerCalls(fetchSpy)).toHaveLength(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("HTTP 500"));
    error.mockRestore();
  });
});
