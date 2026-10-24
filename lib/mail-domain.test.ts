import { describe, expect, it, vi } from "vitest";
import { domainOf, isKnownMailDomain, mailDomainStatus, type MailResolver } from "./mail-domain";

const dnsError = (code: string) => Object.assign(new Error(code), { code });

/** A resolver that answers from a table; anything missing is NXDOMAIN. */
function fakeResolver(table: {
  mx?: Record<string, { exchange: string; priority: number }[] | string>;
  a?: Record<string, string[] | string>;
  aaaa?: Record<string, string[] | string>;
}): MailResolver & { calls: string[] } {
  const calls: string[] = [];
  const answer =
    <T>(kind: string, records: Record<string, T[] | string> | undefined) =>
    async (domain: string): Promise<T[]> => {
      calls.push(`${kind} ${domain}`);
      const value = records?.[domain];
      if (value === undefined) throw dnsError("ENOTFOUND");
      if (typeof value === "string") throw dnsError(value);
      return value;
    };
  return {
    calls,
    resolveMx: answer("mx", table.mx),
    resolve4: answer("a", table.a),
    resolve6: answer("aaaa", table.aaaa),
  };
}

describe("mailDomainStatus", () => {
  it("is deliverable with a real MX record", async () => {
    const resolver = fakeResolver({ mx: { "mail.test": [{ exchange: "mx.mail.test", priority: 10 }] } });
    expect(await mailDomainStatus("mail.test", resolver)).toBe("deliverable");
  });

  it("is undeliverable when the domain doesn't exist", async () => {
    const resolver = fakeResolver({ mx: { "nomail.test": "ENOTFOUND" } });
    expect(await mailDomainStatus("nomail.test", resolver)).toBe("undeliverable");
  });

  it("is undeliverable with only a null MX", async () => {
    const resolver = fakeResolver({ mx: { "null.test": [{ exchange: "", priority: 0 }] } });
    expect(await mailDomainStatus("null.test", resolver)).toBe("undeliverable");
  });

  it("falls back to the domain's address when there's no MX", async () => {
    const withA = fakeResolver({ mx: { "web.test": "ENODATA" }, a: { "web.test": ["192.0.2.1"] } });
    expect(await mailDomainStatus("web.test", withA)).toBe("deliverable");

    const withAaaa = fakeResolver({
      mx: { "v6.test": "ENODATA" },
      a: { "v6.test": "ENODATA" },
      aaaa: { "v6.test": ["2001:db8::1"] },
    });
    expect(await mailDomainStatus("v6.test", withAaaa)).toBe("deliverable");

    const nothing = fakeResolver({
      mx: { "parked.test": "ENODATA" },
      a: { "parked.test": "ENODATA" },
      aaaa: { "parked.test": "ENODATA" },
    });
    expect(await mailDomainStatus("parked.test", nothing)).toBe("undeliverable");
  });

  it("is unknown (so never blocks) when DNS fails or times out", async () => {
    for (const code of ["ETIMEOUT", "ESERVFAIL", "ECONNREFUSED"]) {
      const resolver = fakeResolver({ mx: { "flaky.test": code } });
      expect(await mailDomainStatus("flaky.test", resolver)).toBe("unknown");
    }
    const resolver = fakeResolver({
      mx: { "half.test": "ENODATA" },
      a: { "half.test": "ETIMEOUT" },
      aaaa: { "half.test": "ENODATA" },
    });
    expect(await mailDomainStatus("half.test", resolver)).toBe("unknown");
  });

  it("skips the lookup for the big providers and the reserved test domains", async () => {
    const resolver = fakeResolver({});
    for (const domain of ["gmail.com", "ICLOUD.com", "yahoo.com", "outlook.com", "hotmail.com", "example.com"]) {
      expect(await mailDomainStatus(domain, resolver)).toBe("deliverable");
    }
    expect(resolver.calls).toEqual([]);
  });

  it("doesn't look up something that isn't a hostname", async () => {
    const resolver = fakeResolver({});
    const lookup = vi.spyOn(resolver, "resolveMx");
    for (const domain of ["localhost", "no spaces.com", "-bad.com", "a..b.com"]) {
      expect(await mailDomainStatus(domain, resolver)).toBe("undeliverable");
    }
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("domainOf", () => {
  it("returns the lowercased domain, or null", () => {
    expect(domainOf("test.parent@Example.COM")).toBe("example.com");
    expect(domainOf("test.parent")).toBeNull();
    expect(domainOf("test.parent@")).toBeNull();
  });
});

describe("isKnownMailDomain", () => {
  it("knows the chip domains, ignoring case", () => {
    expect(isKnownMailDomain("Gmail.com")).toBe(true);
    expect(isKnownMailDomain("pesto.test")).toBe(false);
  });
});
