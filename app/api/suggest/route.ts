import Anthropic from "@anthropic-ai/sdk";
import { cleanLabel, isValidLabel } from "@/lib/names";
import { TAKEN_NAMES } from "@/lib/mock-registry";

export const runtime = "nodejs";

const SYSTEM = `You are a naming assistant for the Igra Name Service (INS).
Given a seed word, suggest 8 creative .ins name ideas that are:
- 3-20 chars, lowercase letters/digits/hyphens only
- no leading/trailing hyphen, no dots
- creative but memorable, punchy, dApp-friendly
- a mix of: direct variants, web3/crypto vibes, short & brandable
Output ONLY a JSON array of lowercase strings (no .ins suffix, no prose).
Example: ["cryptoalice","alicedao","alicepro","0xalice","alicegm","alicelabs","alicehq","alicex"]`;

export async function POST(req: Request) {
  try {
    const { seed } = await req.json();
    const seedClean = cleanLabel(String(seed ?? ""));
    if (seedClean.length < 3) {
      return Response.json({ error: "seed too short" }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ names: fallback(seedClean) });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM,
      messages: [
        { role: "user", content: `Seed: "${seedClean}". Give me 8 ideas.` },
      ],
    });

    const text =
      msg.content
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("")
        .trim();

    let names: string[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      names = match ? JSON.parse(match[0]) : [];
    } catch {
      names = [];
    }

    names = names
      .map((s) => cleanLabel(String(s)))
      .filter((s) => isValidLabel(s) && !TAKEN_NAMES.has(s))
      .slice(0, 8);

    if (names.length < 4) names = fallback(seedClean);

    return Response.json({ names });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message ?? "failed" },
      { status: 500 }
    );
  }
}

function fallback(seed: string): string[] {
  return [
    `${seed}x`, `${seed}dao`, `${seed}hq`, `${seed}labs`,
    `0x${seed}`, `my${seed}`, `${seed}gm`, `${seed}pro`,
  ]
    .map(cleanLabel)
    .filter(isValidLabel)
    .filter((s) => !TAKEN_NAMES.has(s));
}
