import { NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";

/**
 * Returns the API key and config needed for the client to open a
 * Gemini Live WebSocket.  The key is kept server-side so it never
 * leaks into the client bundle.
 *
 * The client calls this once before opening a session, receives a
 * short-lived "token" payload, then connects directly to the Live API
 * WebSocket from the browser.
 *
 * NOTE: In production you would use a proper ephemeral token /
 * OAuth exchange.  For this hackathon MVP we pass the raw API key
 * over HTTPS to our own frontend — acceptable for a demo.
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

    // Build the voice name from the organism category
    const persona = getPersona(organism?.category);

    // Map persona temperaments to Gemini prebuilt voice names
    const voiceMap = {
      tree: "Orus",       // deep, warm
      bird: "Puck",       // bright, energetic
      flower: "Aoede",    // gentle, lyrical
      insect: "Kore",     // quick, precise
      mushroom: "Charon",  // mysterious, low
    };

    const category = organism?.category?.toLowerCase() || "tree";
    const voiceName = voiceMap[category] || "Orus";

    return NextResponse.json({
      apiKey,
      model: "gemini-2.0-flash-live-001",
      voiceName,
      persona: {
        name: persona.name,
        temperament: persona.temperament,
      },
    });
  } catch (error) {
    console.error("Live token error:", error);
    return NextResponse.json(
      { error: "Failed to generate live session config" },
      { status: 500 }
    );
  }
}
