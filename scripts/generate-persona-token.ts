/**
 * Generate a persona token for AI testing.
 *
 * Usage:
 *   npx tsx scripts/generate-persona-token.ts --user-id <uuid> --persona <name> --role <role>
 *
 * Example:
 *   npx tsx scripts/generate-persona-token.ts \
 *     --user-id "123e4567-e89b-12d3-a456-426614174000" \
 *     --persona "maya-7th-grader" \
 *     --role "student" \
 *     --ttl 24
 *
 * Output:
 *   Magic link URL that can be given to ChatGPT
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// Parse command line arguments
function parseArgs(): {
  userId: string;
  persona: string;
  role: string;
  ttlHours: number;
  baseUrl: string;
} {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    const value = args[i + 1];
    parsed[key] = value;
  }

  if (!parsed["user-id"]) {
    console.error("Error: --user-id is required");
    console.error("");
    console.error("Usage:");
    console.error(
      '  npx tsx scripts/generate-persona-token.ts --user-id <uuid> --persona <name> --role <role> [--ttl <hours>] [--base-url <url>]'
    );
    console.error("");
    console.error("Example:");
    console.error(
      '  npx tsx scripts/generate-persona-token.ts --user-id "abc123" --persona "maya-7th-grader" --role "student"'
    );
    process.exit(1);
  }

  return {
    userId: parsed["user-id"],
    persona: parsed["persona"] || "test-persona",
    role: parsed["role"] || "student",
    ttlHours: parseInt(parsed["ttl"] || "24", 10),
    baseUrl:
      parsed["base-url"] ||
      process.env.VERCEL_URL ||
      "http://localhost:3000",
  };
}

async function main() {
  // Load environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: Missing environment variables");
    console.error("Make sure these are set:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    console.error("");
    console.error("You can run with:");
    console.error(
      "  npx dotenv -e .env.local -- npx tsx scripts/generate-persona-token.ts ..."
    );
    process.exit(1);
  }

  const { userId, persona, role, ttlHours, baseUrl } = parseArgs();

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Verify the user exists
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError || !userData?.user) {
    console.error(`Error: User not found with ID: ${userId}`);
    console.error("");
    console.error("To find user IDs, check Supabase Dashboard:");
    console.error("  Authentication → Users → Click a user → Copy ID");
    process.exit(1);
  }

  // Generate a random token
  const token = randomBytes(32).toString("base64url");

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  // Insert the token
  const { error: insertError } = await supabase.from("persona_tokens").insert({
    token,
    user_id: userId,
    persona_name: persona,
    role,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error("Error creating token:", insertError.message);
    process.exit(1);
  }

  // Build the magic link URL
  const cleanBaseUrl = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`;
  const magicLink = `${cleanBaseUrl}/api/auth/persona?token=${token}`;

  console.log("");
  console.log("=".repeat(60));
  console.log("PERSONA TOKEN GENERATED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Persona:    ${persona}`);
  console.log(`Role:       ${role}`);
  console.log(`User:       ${userData.user.email}`);
  console.log(`Expires:    ${expiresAt.toISOString()}`);
  console.log("");
  console.log("MAGIC LINK (give this to ChatGPT):");
  console.log("");
  console.log(magicLink);
  console.log("");
  console.log("=".repeat(60));
  console.log("");
  console.log("Prompt for ChatGPT:");
  console.log(`"Go to ${magicLink} and explore the ${role} dashboard as a ${persona}. Report any UX issues you find."`);
  console.log("");
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
