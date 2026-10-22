import type { Metadata } from "next";
import { assertKitEnabled, kitMetadata } from "./gate";
import { Kit } from "./kit";

export const metadata: Metadata = kitMetadata;

/** /apply/_kit: every shared component in every state. Not in production. */
export default function KitPage() {
  assertKitEnabled();
  return <Kit />;
}
