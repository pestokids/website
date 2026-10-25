import type { Viewport } from "next";
import { meta, tagline } from "@/content/landing";
import { GetInEarly } from "./_components/landing/get-in-early";
import { Header } from "./_components/landing/header";
import { ParallaxLoader } from "./_components/landing/parallax-loader";
import { Scene } from "./_components/landing/scene";
import { StructuredData } from "./_components/landing/structured-data";
import { pageMetadata } from "./_components/page-metadata";
import "./_components/landing/landing.css";

// Prerendered at build time; nothing here may read the request.
export const ensureStatic = "navigation";

export const metadata = pageMetadata({ title: meta.title, description: meta.description, path: "/" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#13235f",
};

/** The landing page: the felt night scene, the tagline and one button to /apply. */
export default function HomePage() {
  return (
    <main className="landing">
      <Scene />
      <div className="shade" />
      <div className="ui">
        <Header />
        <section className="copy">
          <h1>
            {tagline.lines.map((line) => (
              <span key={line}>{line} </span>
            ))}
            <span className="why">{tagline.highlight}</span>
          </h1>
          <GetInEarly />
        </section>
      </div>
      <ParallaxLoader />
      <StructuredData />
    </main>
  );
}
