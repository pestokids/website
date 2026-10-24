import { Resolver } from "node:dns/promises";
import type { NextRequest } from "next/server";
import { mailDomainStatus } from "@/lib/mail-domain";

/**
 * GET /api/email-domain?domain=example.com → `{ status }`, where status is
 * "deliverable", "undeliverable" or "unknown" (lib/mail-domain.ts). Used by
 * the email screen before submit; browsers can't look up MX records.
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
  if (!domain) return Response.json({ error: "domain is required" }, { status: 400 });

  // Each query gives up after 2s, so the email screen never waits long.
  const status = await mailDomainStatus(domain, new Resolver({ timeout: 2000, tries: 1 }));
  return Response.json(
    { status },
    {
      // DNS answers change rarely: let the CDN reuse a definite one for an hour.
      headers: {
        "Cache-Control": status === "unknown" ? "no-store" : "public, max-age=0, s-maxage=3600",
      },
    },
  );
}
