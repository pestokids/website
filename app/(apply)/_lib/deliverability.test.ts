import { describe, expect, it, vi } from "vitest";
import { canReceiveMail } from "./deliverability";

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch &
    ReturnType<typeof vi.fn>;

describe("canReceiveMail", () => {
  it("asks the server about the domain", async () => {
    const fetchSpy = reply({ status: "undeliverable" });
    expect(await canReceiveMail("test.parent@nomail.test", fetchSpy)).toBe(false);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/email-domain?domain=nomail.test");

    expect(await canReceiveMail("test.parent@mail.test", reply({ status: "deliverable" }))).toBe(true);
  });

  it("doesn't ask about the big providers", async () => {
    const fetchSpy = reply({ status: "undeliverable" });
    expect(await canReceiveMail("test.parent@gmail.com", fetchSpy)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets the address through when the check can't answer", async () => {
    expect(await canReceiveMail("test.parent@flaky.test", reply({ status: "unknown" }))).toBe(true);
    expect(await canReceiveMail("test.parent@flaky.test", reply({ error: "boom" }, 500))).toBe(true);
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await canReceiveMail("test.parent@flaky.test", offline)).toBe(true);
  });
});
