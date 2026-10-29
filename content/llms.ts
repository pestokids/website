/**
 * /llms.txt: a plain-text summary of Pesto for AI assistants, in the llms.txt
 * format (a title, a one-line summary, then sections of links).
 *
 * Placeholder text until the copy session. Keep the facts in line with the
 * page's description and structured data, so every source agrees.
 */
import { absoluteUrl } from "@/lib/site";
import { brand, meta } from "./landing";

export const llmsTxt = `# ${brand.name} (${brand.alternateName})

> ${meta.description}

## What Pesto is

- ${brand.name}, also called ${brand.alternateName}, is a playful learning app for curious kids.
- It's fun first: stories, questions and games, with the learning built in along the way.
- The app's guide is Pesto, a friendly green parrot.

## Who it's for

- Kids aged 3 to 8.
- Their parents, who sign the family up.

## Where it stands

- Pesto is in private beta.
- Parents can apply to join the first group of families, called Founding Families, at ${absoluteUrl("/apply")}.

## Links

- [Home](${absoluteUrl("/")}): what Pesto is
- [Apply](${absoluteUrl("/apply")}): join Founding Families, the private beta
- [Privacy policy](${absoluteUrl("/privacy")}): what Pesto collects and why, on the site and in the app
- [Terms of use](${absoluteUrl("/terms")}): the rules for using the site and the app
- [Contact](${absoluteUrl("/contact")}): how to reach the Pesto team, including app support

## Contact

- Email: ${brand.email}
- Contact page: ${absoluteUrl("/contact")}
- Instagram: ${brand.instagram}
`;
