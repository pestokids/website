import type { Metadata } from "next";
import { FlowColumn } from "../../../_components/flow-column";
import { assertKitEnabled, kitMetadata } from "../gate";
import { FooterDemo } from "./footer-demo";

export const metadata: Metadata = { ...kitMetadata, title: "Component kit · sticky footer" };

/** /apply/_kit/footer: a names-like screen for checking the footer above the keyboard. */
export default function KitFooterPage() {
  assertKitEnabled();
  return (
    <FlowColumn>
      <FooterDemo />
    </FlowColumn>
  );
}
