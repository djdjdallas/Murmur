import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates illustrated story panels using Imagen 3 via Gemini.
 * Accepts an organism and narrative script, returns image URLs.
 */
export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { organism, script } = await request.json();

    if (!organism || !script) {
      return NextResponse.json(
        { error: "Organism and script are required" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini to extract 3 scene descriptions from the script
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const sceneResult = await model.generateContent(
      `Given this first-person narration from a ${organism.commonName} (${organism.category}), extract exactly 3 key visual moments that would make beautiful illustrated panels.

Narration:
"${script}"

Respond with ONLY a JSON array of 3 strings, each being a vivid image generation prompt (30-50 words). Style: watercolor nature illustration, warm natural lighting, botanical art style. Include the specific organism and its habitat.

Example format:
["prompt 1", "prompt 2", "prompt 3"]`
    );

    let scenePrompts;
    try {
      let text = sceneResult.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) text = jsonMatch[0];
      scenePrompts = JSON.parse(text);
    } catch {
      // Fallback scene prompts if parsing fails
      scenePrompts = [
        `Watercolor illustration of a ${organism.commonName} in its natural ${organism.habitat} habitat, warm golden hour lighting, botanical art style`,
        `Close-up watercolor painting of ${organism.commonName} (${organism.scientificName}) showing intricate natural details, soft natural colors, nature journal style`,
        `Wide landscape watercolor of ${organism.habitat} ecosystem featuring ${organism.commonName}, gentle morning light, field guide illustration style`,
      ];
    }

    // Generate images using Imagen 3 via the gemini-2.0-flash model
    // with image generation enabled
    const imagenModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const panels = [];

    for (const prompt of scenePrompts.slice(0, 3)) {
      try {
        const imageResult = await imagenModel.generateContent(
          `Generate a beautiful watercolor nature illustration: ${prompt}`
        );

        const response = imageResult.response;
        const parts = response.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
          if (part.inlineData) {
            panels.push({
              imageData: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              caption: prompt,
            });
            break;
          }
        }
      } catch (imgError) {
        console.error("Panel generation failed for prompt:", prompt, imgError);
        // Continue with remaining panels
      }
    }

    return NextResponse.json({ panels });
  } catch (error) {
    console.error("Story panels error:", error);
    return NextResponse.json(
      { error: "Failed to generate story panels" },
      { status: 500 }
    );
  }
}
