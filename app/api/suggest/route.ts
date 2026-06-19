import Anthropic from "@anthropic-ai/sdk";
import { cleanLabel, isValidLabel, prepareForContract, displayLabel, isPunycodeLabel } from "@/lib/names";
import { TAKEN_NAMES } from "@/lib/mock-registry";

export const runtime = "nodejs";

const SYSTEM_ASCII = `You are a naming assistant for the Igra Name Service (INS).
Given a seed word, suggest 8 creative .ins name ideas that are:
- 3-20 chars, lowercase letters/digits/hyphens only
- no leading/trailing hyphen, no dots
- creative but memorable, punchy, dApp-friendly
- a mix of: direct variants, web3/crypto vibes, short & brandable
Output ONLY a JSON array of lowercase strings (no .ins suffix, no prose).
Example: ["cryptoalice","alicedao","alicepro","0xalice","alicegm","alicelabs","alicehq","alicex"]`;

const SYSTEM_EMOJI = `You are a naming assistant for the Igra Name Service (INS), which now supports emoji names.
Given a seed emoji (or short emoji+text combo), suggest 8 creative emoji-bearing name ideas:
- Pick a mix of: pure emoji combos (2-3 emoji together), the seed paired with related thematic emoji, the seed + a short ASCII suffix (e.g. king, queen, lord, gang, dao, fam, pro, hq), and short text + the seed
- ABSOLUTELY NO leading/trailing hyphens
- Keep each suggestion to AT MOST 4 graphemes total (mixing emoji + 1-3 short ASCII letters is fine)
- Stay culturally on-theme with the seed — if seed is 🔥, suggest hot/intense things; if 🚀 suggest space/launch; if 💎 suggest wealth/rare; if ❤️ suggest love
- Avoid Cyrillic / Greek letters or anything that looks Latin but isn't (causes ENSIP-15 rejection)
- No skin-tone modifiers (keep base emoji)

Output ONLY a JSON array of strings — each string is the raw Unicode form (emoji + text), no encoding, no prose, no .igra suffix.
Example for seed 🔥: ["🔥🚀","🔥💎","🔥king","🔥gang","🌋🔥","🔥pro","🔥dao","⚡🔥"]
Example for seed 🚀: ["🚀💎","🚀moon","🚀king","🚀dao","🌙🚀","🚀gang","🚀pro","💫🚀"]`;

function isEmojiSeed(seed: string): boolean {
  if (isPunycodeLabel(seed)) return true;
  for (let i = 0; i < seed.length; i++) {
    if (seed.charCodeAt(i) > 0x7f) return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const { seed } = await req.json();
    const rawSeed = String(seed ?? "").trim();

    const emojiMode = isEmojiSeed(rawSeed);

    // In ASCII mode, use the strict cleaner; in emoji mode, the seed might
    // already be Punycode (xn--…), so decode for Claude to see the actual
    // emoji glyph.
    let seedForPrompt: string;
    let seedClean: string;
    if (emojiMode) {
      seedForPrompt = isPunycodeLabel(rawSeed) ? displayLabel(rawSeed) : rawSeed;
      seedClean = seedForPrompt;
      if (!seedClean) return Response.json({ error: "seed too short" }, { status: 400 });
    } else {
      seedClean = cleanLabel(rawSeed);
      if (seedClean.length < 3) return Response.json({ error: "seed too short" }, { status: 400 });
      seedForPrompt = seedClean;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ names: emojiMode ? fallbackEmoji(seedForPrompt) : fallbackAscii(seedClean) });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: emojiMode ? SYSTEM_EMOJI : SYSTEM_ASCII,
      messages: [
        { role: "user", content: `Seed: ${JSON.stringify(seedForPrompt)}. Give me 8 ideas.` },
      ],
    });

    const text = msg.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    let rawNames: string[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      rawNames = match ? JSON.parse(match[0]) : [];
    } catch {
      rawNames = [];
    }

    let names: string[];
    if (emojiMode) {
      // Encode each suggested Unicode name through prepareForContract.
      // Anything that fails ENSIP-15 / round-trip / length check gets dropped.
      const seen = new Set<string>();
      names = [];
      for (const s of rawNames) {
        const str = String(s).trim();
        if (!str) continue;
        try {
          const c = prepareForContract(str);
          if (!seen.has(c) && !TAKEN_NAMES.has(c)) {
            seen.add(c);
            names.push(c);
          }
        } catch {
          // skip — invalid / homograph / round-trip-failed
        }
        if (names.length >= 8) break;
      }
      if (names.length < 4) names = fallbackEmoji(seedForPrompt);
    } else {
      names = rawNames
        .map((s) => cleanLabel(String(s)))
        .filter((s) => isValidLabel(s) && !TAKEN_NAMES.has(s))
        .slice(0, 8);
      if (names.length < 4) names = fallbackAscii(seedClean);
    }

    return Response.json({ names });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message ?? "failed" },
      { status: 500 }
    );
  }
}

function fallbackAscii(seed: string): string[] {
  return [
    `${seed}x`, `${seed}dao`, `${seed}hq`, `${seed}labs`,
    `0x${seed}`, `my${seed}`, `${seed}gm`, `${seed}pro`,
  ]
    .map(cleanLabel)
    .filter(isValidLabel)
    .filter((s) => !TAKEN_NAMES.has(s));
}

// Curated emoji fallbacks per seed glyph — used when the AI is unavailable
// or returns garbage. Each candidate gets encoded + validated below.
function fallbackEmoji(seedDisplay: string): string[] {
  const COMPANION = ["🚀", "💎", "⚡", "🌙", "🔥", "🌟", "❤️", "🦄"];
  const SUFFIXES = ["king", "dao", "pro", "gang", "hq"];
  const candidates: string[] = [];
  // 2-emoji combos
  for (const c of COMPANION) {
    if (c !== seedDisplay) candidates.push(seedDisplay + c);
  }
  // emoji + suffix
  for (const s of SUFFIXES) candidates.push(seedDisplay + s);
  const encoded: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    try {
      const enc = prepareForContract(c);
      if (!seen.has(enc) && !TAKEN_NAMES.has(enc)) {
        seen.add(enc);
        encoded.push(enc);
      }
    } catch {
      // skip
    }
    if (encoded.length >= 8) break;
  }
  return encoded;
}
