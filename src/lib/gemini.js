import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Get the Gemini 2.0 Flash model for vision and text tasks.
 */
export function getModel() {
  return getClient().getGenerativeModel({ model: "gemini-2.5-flash" });
}
