import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser.
 * Returns null if env vars are not configured (allows app to run without Supabase).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

/**
 * Save an encounter to Supabase.
 * Silently fails if Supabase is not configured.
 */
export async function saveEncounter(encounter) {
  const client = createClient();
  if (!client) return null;

  const { data, error } = await client.from("encounters").insert([
    {
      common_name: encounter.commonName,
      scientific_name: encounter.scientificName,
      category: encounter.category,
      habitat: encounter.habitat,
      confidence: encounter.confidence,
      narrative_mode: encounter.narrativeMode,
      script: encounter.script,
      image_base64: encounter.imageBase64?.substring(0, 5000), // truncate for storage
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("Failed to save encounter:", error);
    return null;
  }

  return data;
}
