import { llmsTxt } from "@/content/llms";

/** /llms.txt: the summary for AI assistants, as plain text. Prerendered at build time. */
export function GET() {
  return new Response(llmsTxt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
