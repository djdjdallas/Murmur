import { NextResponse } from "next/server";
import { getModel } from "@/lib/gemini";
import { getNarrativePrompt } from "@/lib/personas";

export async function POST(request) {
  try {
    const { organism, mode = "trail" } = await request.json();

    if (!organism) {
      return NextResponse.json(
        { error: "No organism data provided" },
        { status: 400 }
      );
    }

    const validModes = ["trail", "folklore", "survival", "ranger"];
    const narrativeMode = validModes.includes(mode) ? mode : "trail";

    const { persona, tone, prompt: modePrompt } = getNarrativePrompt(
      organism.category,
      narrativeMode
    );

    const fullPrompt = `${modePrompt}

You are a ${organism.commonName} (${organism.scientificName}).
Category: ${organism.category}
Habitat: ${organism.habitat}
Estimated age: ${organism.estimatedAge}
Interesting fact about you: ${organism.interestingFact}

Speak in first person as this organism. Your character name is "${persona.name}" and your temperament is ${persona.temperament}. Your tone for this narration should be: ${tone}.

Begin speaking directly — no introduction like "I am a..." — just launch into your story naturally.

Keep the narration between 150-250 words. Make it vivid, personal, and memorable.
End with a line that makes the listener want to look more closely at you or your kind.`;

    const model = getModel();
    const result = await model.generateContent(fullPrompt);
    const script = result.response.text().trim();

    return NextResponse.json({
      script,
      persona: {
        name: persona.name,
        voicePitch: persona.voicePitch,
        voiceRate: persona.voiceRate,
        temperament: persona.temperament,
      },
      mode: narrativeMode,
    });
  } catch (error) {
    console.error("Narration error:", error);
    return NextResponse.json(
      { error: "Failed to generate narration. Please try again." },
      { status: 500 }
    );
  }
}
