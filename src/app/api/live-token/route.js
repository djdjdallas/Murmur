import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getPersona } from "@/lib/personas";

/**
 * Generates an ephemeral token for the client to open a Gemini Live
 * WebSocket session. Ephemeral tokens are short-lived and safe to
 * expose to the browser — the real API key never leaves the server.
 */
export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const { organism, mode = "trail" } = await request.json();

    // Generate an ephemeral token (valid for 30 minutes, single use)
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1beta" },
    });

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(
          Date.now() + 2 * 60 * 1000
        ).toISOString(),
      },
    });

    // Build the voice name from the organism category
    const persona = getPersona(organism?.category);

    const voiceMap = {
      tree: "Orus", // deep, warm
      bird: "Puck", // bright, energetic
      flower: "Aoede", // gentle, lyrical
      insect: "Kore", // quick, precise
      mushroom: "Charon", // mysterious, low
    };

    const category = organism?.category?.toLowerCase() || "tree";
    const voiceName = voiceMap[category] || "Orus";

    return NextResponse.json({
      token: token.name,
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      voiceName,
      persona: {
        name: persona.name,
        temperament: persona.temperament,
      },
    });
  } catch (error) {
    console.error("Live token error:", error);
    return NextResponse.json(
      { error: "Failed to generate live session token: " + error.message },
      { status: 500 }
    );
  }
}
