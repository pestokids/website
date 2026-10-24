import type { Metadata } from "next";
import { config } from "@/lib/config";
import { baloo, nunito } from "@/lib/fonts";
import { Analytics } from "./_components/analytics";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pestokids.com"),
  title: "Pesto",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable}`}>
      <body>
        {children}
        {/* Off in local and Preview: no analytics code loads and nothing is sent. */}
        {config.analytics.enabled && (
          <Analytics linkrunnerToken={config.analytics.linkrunnerToken} />
        )}
      </body>
    </html>
  );
}
