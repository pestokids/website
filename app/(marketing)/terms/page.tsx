import { LegalPage, legalMetadata, legalViewport } from "../_components/legal-page";

// Prerendered at build time; nothing here may read the request.
export const ensureStatic = "navigation";

export const metadata = legalMetadata("terms");

export const viewport = legalViewport;

export default function TermsPage() {
  return <LegalPage name="terms" />;
}
