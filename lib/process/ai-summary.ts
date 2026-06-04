import { hasAnyAiKey, hasOpenAiKey } from "@/lib/env";

export interface SummaryProvider {
  summarize(title: string, sourceText: string): Promise<string | null>;
}

export class NoOpSummaryProvider implements SummaryProvider {
  async summarize(): Promise<string | null> {
    return null;
  }
}

/** Optional OpenAI — only when key exists. */
export class OpenAiSummaryProvider implements SummaryProvider {
  async summarize(title: string, sourceText: string): Promise<string | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Summarize Solana ecosystem news in 2 sentences. Neutral tone. No investment advice.",
          },
          { role: "user", content: `${title}\n\n${sourceText.slice(0, 800)}` },
        ],
        max_tokens: 120,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  }
}

export function getSummaryProvider(): SummaryProvider {
  if (hasOpenAiKey()) return new OpenAiSummaryProvider();
  if (hasAnyAiKey()) return new NoOpSummaryProvider();
  return new NoOpSummaryProvider();
}
