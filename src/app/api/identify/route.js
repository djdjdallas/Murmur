import { NextResponse } from "next/server";
import { getModel } from "@/lib/gemini";

const IDENTIFICATION_PROMPT = `You are a world-class naturalist and taxonomist. Analyze this image and identify the organism (plant, tree, bird, insect, mushroom, or flower).

Respond ONLY with valid JSON in this exact format:
{
  "commonName": "string",
  "scientificName": "string",
  "category": "tree|bird|flower|insect|mushroom",
  "habitat": "brief habitat description",
  "estimatedAge": "estimated age or life stage",
  "conservationStatus": "conservation status if known, or 'Not Evaluated'",
  "interestingFact": "one fascinating fact about this organism",
  "confidence": 0.0 to 1.0
}

Rules:
- "category" MUST be one of: tree, bird, flower, insect, mushroom
- If the organism is a general plant, classify as "tree" or "flower" as appropriate
- "confidence" should reflect how certain you are of the identification (0.0 = no idea, 1.0 = absolutely certain)
- If no organism is visible or identifiable, set confidence to 0.0 and fill other fields with "Unknown"
- Do NOT include markdown formatting or code fences — just raw JSON`;

export async function POST(request) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const model = getModel();

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const result = await model.generateContent([
      IDENTIFICATION_PROMPT,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    // Parse JSON from response, handling potential markdown wrapping
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const organism = JSON.parse(jsonText);

    // Validate confidence threshold
    if (organism.confidence < 0.6) {
      return NextResponse.json({
        identified: false,
        organism,
        message:
          "I'm not confident enough in this identification. Try getting closer or improving the lighting.",
      });
    }

    return NextResponse.json({
      identified: true,
      organism,
    });
  } catch (error) {
    console.error("Identification error:", error);
    return NextResponse.json(
      { error: "Failed to identify organism. Please try again." },
      { status: 500 }
    );
  }
}
