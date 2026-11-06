import { LegalPage, legalMetadata, legalViewport } from "../_components/legal-page";

// Prerendered at build time; nothing here may read the request.
export const ensureStatic = "navigation";

export const metadata = legalMetadata("privacy");

export const viewport = legalViewport;

export default function PrivacyPage() {
  return <LegalPage name="privacy" />;
}
