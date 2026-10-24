import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

// Loaded lazily: only the modules a test calls are imported. (import.meta.glob
// is typed via the rate-limiter test helper's vite/client reference.)
const modules = import.meta.glob("./**/*.*s");

/** A fresh in-memory Convex backend with this app's functions and components. */
export function setupConvex() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}

/**
 * Calls `applications.submit`. Its public return type is a plain string ID
 * (spam-trap responses carry a made-up one); real submits return a table ID.
 */
export async function submit(
  t: ReturnType<typeof setupConvex>,
  args: FunctionArgs<typeof api.applications.submit>,
) {
  const result = await t.mutation(api.applications.submit, args);
  return { ...result, applicationId: result.applicationId as Id<"applications"> };
}
