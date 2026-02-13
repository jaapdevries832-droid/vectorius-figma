/**
 * Cleanup old chat attachments (> 7 days).
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/cleanup-attachments.ts
 *
 * Options:
 *   --dry-run    Show what would be deleted without deleting
 *   --days N     Override retention period (default: 7)
 */

import { createClient } from "@supabase/supabase-js";

function parseArgs(): { dryRun: boolean; days: number } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let days = 7;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    if (args[i] === "--days" && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { dryRun, days };
}

async function main() {
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
      "  npx dotenv -e .env.local -- npx tsx scripts/cleanup-attachments.ts"
    );
    process.exit(1);
  }

  const { dryRun, days } = parseArgs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  console.log(
    `Cleanup: deleting attachments older than ${days} days (before ${cutoff.toISOString()})`
  );
  if (dryRun) console.log("DRY RUN -- no deletions will occur");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Fetch old attachments that haven't been soft-deleted yet
  const { data: oldAttachments, error } = await supabase
    .from("chat_attachments")
    .select("id, storage_path, file_name, created_at")
    .lt("created_at", cutoff.toISOString())
    .is("deleted_at", null);

  if (error) {
    console.error("Query error:", error.message);
    process.exit(1);
  }

  if (!oldAttachments || oldAttachments.length === 0) {
    console.log("No attachments to clean up.");
    return;
  }

  console.log(`Found ${oldAttachments.length} attachment(s) to delete`);

  if (dryRun) {
    for (const att of oldAttachments) {
      console.log(
        `  [DRY RUN] Would delete: ${att.file_name} (path: ${att.storage_path}, id: ${att.id}, created: ${att.created_at})`
      );
    }
    return;
  }

  // 2. Delete storage objects in batches
  const storagePaths = oldAttachments.map((a) => a.storage_path);
  const BATCH_SIZE = 100;

  for (let i = 0; i < storagePaths.length; i += BATCH_SIZE) {
    const batch = storagePaths.slice(i, i + BATCH_SIZE);
    const { error: storageError } = await supabase.storage
      .from("chat-attachments")
      .remove(batch);

    if (storageError) {
      console.error(
        `Storage delete error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`,
        storageError.message
      );
    } else {
      console.log(
        `  Deleted ${batch.length} storage object(s) (batch ${Math.floor(i / BATCH_SIZE) + 1})`
      );
    }
  }

  // 3. Soft-delete DB records (set deleted_at, preserve extraction data)
  const ids = oldAttachments.map((a) => a.id);
  const { error: dbError, count } = await supabase
    .from("chat_attachments")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (dbError) {
    console.error("DB update error:", dbError.message);
    process.exit(1);
  }

  console.log(
    `Soft-deleted ${count ?? ids.length} attachment record(s) (extraction data preserved)`
  );
  console.log("Cleanup complete.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
