import { Baloo_2, Nunito } from "next/font/google";

/** Display face. Preloaded: it's on the LCP headline of most screens. */
export const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

/** Body fallback for platforms without ui-rounded / SF Pro Rounded. */
export const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
  preload: false,
});
