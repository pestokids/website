import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
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
