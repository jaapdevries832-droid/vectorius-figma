# Vectorius PRD Pivot Plan 6: Chat Image Upload & Vision Extraction

**Created**: 2026-02-12
**Branch**: `main` -> new branch `prd-6-chat-image-upload`
**Target**: Add image upload capability to the AI chat for both student and parent roles, with Azure OpenAI vision extraction and a cleanup lifecycle.

---

## Context

Students and parents currently interact with the AI tutor/assistant via text-only chat. There is no way to share images of homework, diagrams, or math problems. This limits the effectiveness of the AI tutor since many middle-school assignments are handwritten or visual.

This PRD adds a complete image upload pipeline: file selection UI, server-side upload to Supabase Storage, thumbnail rendering in chat, Azure OpenAI vision extraction, and scheduled cleanup. The architecture avoids scope creep into chat message persistence (which remains localStorage-only) by linking attachments directly to the uploader's user ID.

---

## Key Changes Summary

- **New DB tables**: `chat_attachments` (tracks uploaded images) and `image_extractions` (stores vision analysis results)
- **New Supabase Storage bucket**: `chat-attachments` (private, 8MB limit, image MIME types only)
- **New API routes**: `/api/chat/upload` (server-side file upload) and `/api/chat/attachment/[id]` (signed URL for thumbnails)
- **Modified chat UI**: Attach button (paperclip icon) + preview thumbnail in both `ChatInterface` and `ParentChatInterface`
- **Modified chat API**: `/api/chat` route gains vision extraction flow when `attachmentId` is present
- **New cleanup script**: `scripts/cleanup-attachments.ts` deletes old attachments after 7 days

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Upload path | Server-side via service role | Simpler + safer. `createServiceClient()` already exists. No Storage RLS policies needed. |
| Chat persistence | No `chat_messages` table | Keep scope focused on image upload. Chat stays localStorage-only. Attachments linked to `uploader_user_id`. |
| Vision deployment | Separate `AZURE_OPENAI_VISION_DEPLOYMENT` env var | Not all Azure deployments support vision. Falls back to `AZURE_OPENAI_DEPLOYMENT` if unset. |
| Attachment reference in chat | `attachmentId` field added to localStorage `Message` interface | Minimal change to existing architecture. |
| HEIC handling | Accept at upload, placeholder icon in browser | HEIC can't preview natively in most browsers. Azure vision can process it. Client-side conversion deferred. |

---

## A) Gaps to Address

| # | Gap | Location | Priority |
|---|-----|----------|----------|
| 1 | No file upload UI in chat | `components/ChatInterface.tsx`, `components/ParentChatInterface.tsx` | Must Fix |
| 2 | No Supabase Storage usage in codebase | No bucket, no storage API calls anywhere | Must Fix |
| 3 | No attachment persistence | No DB tables for file metadata or extractions | Must Fix |
| 4 | Chat API has no vision capability | `app/api/chat/route.ts` only handles text | Must Fix |
| 5 | Chat API does not validate user session | `app/api/chat/route.ts` has no auth check | High |
| 6 | No image rendering in chat bubbles | Message rendering is text-only | Must Fix |
| 7 | No lifecycle management for uploaded images | Files would accumulate indefinitely | High |

---

## B) Implementation Plan

### Phase 1: Infrastructure (S6-A, S6-B)

---

### Slice S6-A: Schema -- `chat_attachments` + `image_extractions` tables

**Goal**: Create the two database tables that back the image upload feature, with minimal RLS (users can SELECT own data; all writes go through service role).

**Issues Addressed**: #3

#### DB + RLS Changes

**New migration**: `supabase migration new chat_attachments_and_extractions`

```sql
-- ============================================================
-- chat_attachments: tracks uploaded images in chat context
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_attachments_uploader ON chat_attachments(uploader_user_id);
CREATE INDEX idx_chat_attachments_created ON chat_attachments(created_at);

ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own attachments (for thumbnail rendering)
CREATE POLICY "users_select_own_attachments" ON chat_attachments
  FOR SELECT USING (auth.uid() = uploader_user_id);

-- ============================================================
-- image_extractions: stores Azure vision analysis results
-- ============================================================
CREATE TABLE IF NOT EXISTS image_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL REFERENCES chat_attachments(id) ON DELETE CASCADE,
  extracted_text TEXT NOT NULL,
  subject TEXT,
  confidence REAL,
  diagram_description TEXT,
  raw_json JSONB,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_image_extractions_attachment ON image_extractions(attachment_id);

ALTER TABLE image_extractions ENABLE ROW LEVEL SECURITY;

-- Users can SELECT extractions for their own attachments
CREATE POLICY "users_select_own_extractions" ON image_extractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_attachments ca
      WHERE ca.id = image_extractions.attachment_id
        AND ca.uploader_user_id = auth.uid()
    )
  );
```

#### Frontend Changes

None.

#### Acceptance Criteria

- [ ] `supabase db push` succeeds
- [ ] `supabase migration list` shows local/remote aligned
- [ ] Both tables exist with correct columns and constraints
- [ ] RLS is enabled on both tables
- [ ] `deleted_at` column is nullable on `chat_attachments`

#### Manual Test Script

1. Run `supabase db push`
2. Run `supabase migration list` -- confirm aligned
3. SQL editor: `SELECT * FROM chat_attachments;` -- 0 rows, no error
4. SQL editor: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('chat_attachments','image_extractions');` -- both `true`

---

### Slice S6-B: Supabase Storage -- `chat-attachments` bucket

**Goal**: Create a private storage bucket for uploaded chat images with 8MB file size limit and image-only MIME types.

**Issues Addressed**: #2

#### DB + RLS Changes

**New migration**: `supabase migration new create_chat_attachments_bucket`

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  8388608,  -- 8 MB
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- No storage RLS policies needed: all operations use service role
```

#### Frontend Changes

None.

#### Acceptance Criteria

- [ ] `supabase db push` succeeds
- [ ] Bucket `chat-attachments` appears in Supabase Storage dashboard
- [ ] Bucket is private, 8MB limit, MIME types restricted to jpeg/png/heic/heif

#### Manual Test Script

1. Run `supabase db push`
2. Supabase Dashboard -> Storage -> verify `chat-attachments` bucket exists
3. Confirm settings: private, 8MB limit, image MIME types only

---

### Phase 2: Server-Side Upload (S6-C)

---

### Slice S6-C: Auth helper + Upload API route

**Goal**: Create a reusable auth helper to extract the authenticated user from request cookies, and a server-side API route that validates session, validates the file, uploads to Supabase Storage, and inserts a `chat_attachments` row.

**Issues Addressed**: #2, #3, #5

#### DB + RLS Changes

None.

#### Backend Changes

**New file: `lib/supabase/auth-from-request.ts`**
- Extracts authenticated Supabase user from Next.js App Router cookies
- Uses `createServerClient` from `@supabase/ssr` with anon key (for session validation, not service role)
- Returns `User | null`

**New file: `app/api/chat/upload/route.ts`**
- POST handler:
  1. Authenticate via `getAuthUserFromRequest()`
  2. Parse `FormData`, extract `file`
  3. Validate MIME type (`image/jpeg`, `image/png`, `image/heic`, `image/heif`)
  4. Validate file size (max 8MB)
  5. Build storage path: `<user_id>/<uuid>.<ext>`
  6. Upload to `chat-attachments` bucket via `createServiceClient()`
  7. Insert `chat_attachments` row
  8. On insert failure: best-effort cleanup of storage object
  9. Return `{ attachmentId, fileName, mimeType }`

#### Frontend Changes

None (API-only slice).

#### Files to Modify/Create

| File | Action |
|------|--------|
| `lib/supabase/auth-from-request.ts` | CREATE |
| `app/api/chat/upload/route.ts` | CREATE |

#### Acceptance Criteria

- [ ] POST without auth returns 401
- [ ] POST with auth but no file returns 400
- [ ] POST with `.txt` file returns 400 (wrong MIME type)
- [ ] POST with 10MB image returns 400 (too large)
- [ ] POST with valid JPG returns `{ attachmentId, fileName, mimeType }`
- [ ] File appears in Supabase Storage at `chat-attachments/<user_id>/<uuid>.jpg`
- [ ] Row exists in `chat_attachments` with matching metadata
- [ ] `npm run build` passes
- [ ] `npm run type-check` passes

#### Manual Test Script

1. Log in as a student
2. Use browser DevTools or `curl` to POST FormData with a small JPG to `/api/chat/upload`
3. Verify response contains `attachmentId`
4. Supabase Dashboard -> Storage: file exists at expected path
5. Supabase Dashboard -> `chat_attachments` table: row exists with correct metadata
6. POST a `.txt` file -> expect 400
7. POST without auth cookies -> expect 401

---

### Phase 3: Chat UI Integration (S6-D, S6-E)

---

### Slice S6-D: Chat UI -- Attach button + file selection + preview

**Goal**: Add a paperclip "Attach" button to both `ChatInterface` and `ParentChatInterface`. On file selection, show a preview thumbnail above the input. Upload the file on send, then pass `attachmentId` to the chat API.

**Issues Addressed**: #1

#### DB + RLS Changes

None.

#### Backend Changes

None.

#### Frontend Changes

**Modify `components/ChatInterface.tsx`**:
1. Add imports: `Paperclip`, `X`, `ImageIcon` from `lucide-react`
2. Extend `Message` interface with optional `attachmentId?: string`, `attachmentName?: string`, `attachmentMime?: string`
3. Add state: `pendingAttachment` (`{ file: File; previewUrl: string } | null`), `fileInputRef`
4. Add `handleFileSelect` handler: client-side validation (MIME type, 8MB limit), create Object URL for preview
5. Add `clearPendingAttachment` handler: revoke Object URL, clear state
6. Modify `handleSendMessage`: if `pendingAttachment` exists, upload via `/api/chat/upload` first, then send message with `attachmentId`
7. Update POST body to `/api/chat` to include `attachmentId`
8. Add hidden `<input type="file" accept="image/jpeg,image/png,image/heic,image/heif">` with ref
9. Add Attach button (paperclip icon) next to the quick prompts dropdown
10. Add conditional preview strip above input bar when `pendingAttachment` is set
11. Update `StoredChat` serialization to persist attachment fields in localStorage

**Input area layout changes from**:
```
[ Quick Prompts ] [ Input ] [ Send ] [ Clear ]
```
**to**:
```
[ Quick Prompts ] [ Attach ] [ Input ] [ Send ] [ Clear ]
```

**Modify `components/ParentChatInterface.tsx`**:
- Same changes as `ChatInterface.tsx` (both components have identical structure)

#### Files to Modify

| File | Action |
|------|--------|
| `components/ChatInterface.tsx` | MODIFY |
| `components/ParentChatInterface.tsx` | MODIFY |

#### Acceptance Criteria

- [ ] Paperclip button appears in both student and parent chat
- [ ] Clicking opens system file picker filtered to images
- [ ] Selecting a valid image shows preview thumbnail with X to dismiss
- [ ] Selecting invalid file type shows error message
- [ ] Selecting file >8MB shows error message
- [ ] Sending with attachment uploads file first, then sends message
- [ ] Message with attachment stores `attachmentId` in localStorage
- [ ] Sending text without attachment works identically to before
- [ ] `npm run build` passes

#### Manual Test Script

1. Log in as student -> AI Chat
2. Click paperclip -> file picker opens
3. Select a JPG under 8MB -> preview appears above input
4. Click X on preview -> preview disappears
5. Select JPG again, type "Help me solve this", click Send
6. Message appears in chat with text
7. Supabase Storage: file exists
8. Repeat steps 2-7 for parent role
9. Try selecting a `.pdf` -> error message
10. Try selecting a 10MB image -> error message

---

### Slice S6-E: Chat rendering -- attachment thumbnails in message bubbles

**Goal**: When rendering a chat message with `attachmentId`, fetch a signed URL from the server and display the image as a thumbnail in the message bubble.

**Issues Addressed**: #6

#### DB + RLS Changes

None.

#### Backend Changes

**New file: `app/api/chat/attachment/[id]/route.ts`**
- GET handler:
  1. Authenticate via `getAuthUserFromRequest()`
  2. Query `chat_attachments` by `id`, verify `uploader_user_id === auth.uid()`
  3. Generate signed URL via `supabase.storage.from('chat-attachments').createSignedUrl(path, 600)` (10-min expiry)
  4. Return `{ url: signedUrl }`

#### Frontend Changes

**New file: `components/ChatAttachmentThumbnail.tsx`**
- Client component that takes `attachmentId` and optional `mimeType`
- Fetches signed URL from `/api/chat/attachment/[id]` on mount
- Shows loading spinner while fetching
- Shows `<img>` for jpeg/png, placeholder icon for HEIC
- Click opens full image in new tab
- Handles errors gracefully (shows placeholder)

**Modify `components/ChatInterface.tsx`** and **`components/ParentChatInterface.tsx`**:
- Import `ChatAttachmentThumbnail`
- In message rendering, before text content: if `message.attachmentId` exists, render `<ChatAttachmentThumbnail />`

#### Files to Modify/Create

| File | Action |
|------|--------|
| `app/api/chat/attachment/[id]/route.ts` | CREATE |
| `components/ChatAttachmentThumbnail.tsx` | CREATE |
| `components/ChatInterface.tsx` | MODIFY |
| `components/ParentChatInterface.tsx` | MODIFY |

#### Acceptance Criteria

- [ ] Messages with attachments display a thumbnail image in the bubble
- [ ] Thumbnail loads via signed URL (not publicly accessible)
- [ ] Clicking thumbnail opens full image in new tab
- [ ] HEIC attachments show placeholder icon
- [ ] Messages without attachments render identically to before
- [ ] Signed URL API rejects requests for other users' attachments (403)
- [ ] `npm run build` passes

#### Manual Test Script

1. Log in as student, send message with attached image (from S6-D)
2. Thumbnail appears in chat bubble above text
3. Click thumbnail -> full image opens in new tab
4. Refresh page -> thumbnail reloads (new signed URL)
5. Log in as different user -> manually hit `/api/chat/attachment/<id>` of first user's attachment -> 403
6. Repeat for parent role

---

### Phase 4: Vision Extraction (S6-F)

---

### Slice S6-F: Vision extraction flow

**Goal**: When a chat message includes `attachmentId`, the chat API generates a signed URL, calls Azure OpenAI with the image, stores the extraction in `image_extractions`, and injects the extracted text as context into the tutoring prompt. Subsequent messages reuse the cached extraction.

**Issues Addressed**: #4

#### DB + RLS Changes

None (tables exist from S6-A).

#### Backend Changes

**New file: `lib/azure-openai-vision.ts`**
- `getAzureVisionConfig()`: returns config with `visionDeployment` (from `AZURE_OPENAI_VISION_DEPLOYMENT` or fallback to `AZURE_OPENAI_DEPLOYMENT`)
- `buildAzureVisionCompletionsUrl(config)`: builds URL with the vision deployment name
- Re-exports `buildAzureHeaders` from `lib/azure-openai.ts`

**Modify `app/api/chat/route.ts`**:
1. Import vision config helpers and `createServiceClient`
2. Extract `attachmentId` from request body
3. If `attachmentId` is present:
   a. Check `image_extractions` for cached extraction -> reuse if exists
   b. Otherwise: fetch `chat_attachments` row, generate 5-min signed URL
   c. Call Azure vision API with image URL in multi-part content format:
      ```json
      {
        "role": "user",
        "content": [
          { "type": "text", "text": "Describe this image in detail. Transcribe any text, math, or educational content." },
          { "type": "image_url", "image_url": { "url": "<signed-url>" } }
        ]
      }
      ```
   d. Store extraction in `image_extractions` (with subject, confidence, diagram_description if parseable)
4. Inject extracted text as system message context before the user's question:
   ```
   "The student has shared an image. Here is a description of the image contents:\n\n{extractedText}\n\nUse this information to help answer their question."
   ```

#### Frontend Changes

None (frontend already passes `attachmentId` from S6-D).

#### New Environment Variable

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `AZURE_OPENAI_VISION_DEPLOYMENT` | No | Falls back to `AZURE_OPENAI_DEPLOYMENT` | Must be vision-capable (gpt-4o, gpt-4-turbo) |

#### Files to Modify/Create

| File | Action |
|------|--------|
| `lib/azure-openai-vision.ts` | CREATE |
| `app/api/chat/route.ts` | MODIFY |

#### Acceptance Criteria

- [ ] Message with `attachmentId` triggers vision extraction
- [ ] Extraction stored in `image_extractions` with `extracted_text`, `model_used`, `tokens_used`
- [ ] Subsequent messages reuse cached extraction (no duplicate vision call)
- [ ] Extracted text injected as context -> AI response references image content
- [ ] Messages without attachments work identically to before
- [ ] Missing `AZURE_OPENAI_VISION_DEPLOYMENT` falls back to default deployment
- [ ] `npm run build` passes

#### Manual Test Script

1. Log in as student, attach a photo of a math problem, type "Help me solve this"
2. Wait for AI response -> it should reference the specific image content
3. SQL editor: `SELECT * FROM image_extractions;` -> row exists for this attachment
4. Send another message about the same topic -> no new extraction row (cached)
5. Repeat for parent role
6. Test without `AZURE_OPENAI_VISION_DEPLOYMENT` set -> uses default deployment

---

### Phase 5: Lifecycle Management (S6-G)

---

### Slice S6-G: Cleanup script for old attachments

**Goal**: Create a standalone Node.js script that deletes `chat_attachments` records and their Storage objects older than 7 days.

**Issues Addressed**: #7

#### DB + RLS Changes

None.

#### Backend Changes

**New file: `scripts/cleanup-attachments.ts`**

Following the pattern of `scripts/generate-persona-token.ts`:
- Usage: `npx dotenv -e .env.local -- npx tsx scripts/cleanup-attachments.ts [--dry-run] [--days N]`
- Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Queries `chat_attachments` where `created_at < cutoff AND deleted_at IS NULL`
- Deletes storage objects in batches of 100 via `storage.remove()`
- Sets `deleted_at = NOW()` on the DB records (soft delete preserving extraction data)
- `image_extractions` rows are preserved (they reference `attachment_id` which still exists)
- `--dry-run` flag lists what would be deleted without acting
- `--days N` overrides the default 7-day retention

#### Frontend Changes

None.

#### Files to Create

| File | Action |
|------|--------|
| `scripts/cleanup-attachments.ts` | CREATE |

#### Acceptance Criteria

- [ ] Script runs without errors when no old attachments exist
- [ ] `--dry-run` lists what would be deleted without deleting
- [ ] When old attachments exist: storage objects deleted, `deleted_at` set on DB rows
- [ ] `image_extractions` rows preserved (not cascade-deleted)
- [ ] `--days` flag overrides default retention
- [ ] Script follows same patterns as `scripts/generate-persona-token.ts`

#### Manual Test Script

1. Insert test `chat_attachments` row with `created_at` set to 10 days ago (SQL editor)
2. Run `npx dotenv -e .env.local -- npx tsx scripts/cleanup-attachments.ts --dry-run` -> lists test record
3. Run without `--dry-run` -> record has `deleted_at` set, storage file removed
4. Run again -> "No attachments to clean up"

---

## C) Dependencies Diagram

```
S6-A: Schema (tables + RLS)
  |
  +---> S6-B: Storage bucket
  |       |
  |       +---> S6-C: Upload API route + auth helper
  |               |
  |               +---> S6-D: Chat UI (attach button + preview)
  |               |       |
  |               |       +---> S6-E: Chat rendering (thumbnails)
  |               |
  |               +---> S6-F: Vision extraction flow
  |
  +---> S6-G: Cleanup script (depends only on S6-A)
```

**Execution order**: S6-A -> S6-B -> S6-C -> S6-D -> S6-E -> S6-F -> S6-G

S6-G can run in parallel with S6-D/E/F (depends only on S6-A).

---

## D) Files Summary

| File | Action | Slice |
|------|--------|-------|
| `supabase/migrations/<ts>_chat_attachments_and_extractions.sql` | CREATE | S6-A |
| `supabase/migrations/<ts>_create_chat_attachments_bucket.sql` | CREATE | S6-B |
| `lib/supabase/auth-from-request.ts` | CREATE | S6-C |
| `app/api/chat/upload/route.ts` | CREATE | S6-C |
| `components/ChatInterface.tsx` | MODIFY | S6-D, S6-E |
| `components/ParentChatInterface.tsx` | MODIFY | S6-D, S6-E |
| `app/api/chat/attachment/[id]/route.ts` | CREATE | S6-E |
| `components/ChatAttachmentThumbnail.tsx` | CREATE | S6-E |
| `lib/azure-openai-vision.ts` | CREATE | S6-F |
| `app/api/chat/route.ts` | MODIFY | S6-F |
| `scripts/cleanup-attachments.ts` | CREATE | S6-G |

---

## E) Verification Checklist

Per-slice (run after each slice):
- [ ] `supabase db push` succeeds (if schema changes)
- [ ] `supabase db pull` confirms sync (if schema changes)
- [ ] `supabase migration list` shows aligned (if schema changes)
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `git diff` reviewed -- only intended files changed
- [ ] No secrets added
- [ ] No existing migrations edited

End-to-end (after all slices):
- [ ] Student can attach image, send message, see thumbnail, get AI response about image
- [ ] Parent can attach image, send message, see thumbnail, get AI response about image
- [ ] Upload rejects wrong file types and oversized files
- [ ] Signed URLs expire (cannot reuse after 10 minutes)
- [ ] Cleanup script deletes old attachments
- [ ] Text-only chat works identically to before

---

## F) What We Are NOT Doing

1. **No `chat_messages` table** -- chat remains localStorage-only; attachments linked to user, not to a persisted message
2. **No client-side HEIC conversion** -- HEIC accepted at upload; browser preview shows placeholder icon; Azure vision handles it
3. **No drag-and-drop** -- click-to-attach via file picker only
4. **No paste-from-clipboard** -- file selection only
5. **No multiple attachments per message** -- one image per message
6. **No image resize/compression** -- uploaded at original resolution; 8MB limit is the constraint
7. **No Storage bucket RLS policies** -- all storage ops use service role
8. **No real-time attachment sharing** -- each user sees only their own attachments
9. **No advisor role chat** -- advisors do not have a chat interface
10. **No camera capture** -- `capture="environment"` deferred to a future slice
11. **No UI redesign** -- minimal visual changes to existing chat layout

---

## G) Slice Status Tracker

| Slice | Status | Commit SHA | Date | Notes |
|-------|--------|------------|------|-------|
| S6-A: Schema | [x] | 80becd1 | 2026-02-13 | chat_attachments + image_extractions tables |
| S6-B: Storage bucket | [x] | 1388050 | 2026-02-13 | chat-attachments bucket, private, 8MB |
| S6-C: Upload API | [x] | f3e0b19 | 2026-02-13 | auth helper + /api/chat/upload |
| S6-D: Chat UI attach | [x] | 972b261 | 2026-02-13 | Paperclip button + preview in both chats |
| S6-E: Chat thumbnails | [x] | 91e08bf | 2026-02-13 | Signed URL endpoint + ChatAttachmentThumbnail |
| S6-F: Vision extraction | [x] | bbabbc9 | 2026-02-13 | Azure vision in chat route + caching |
| S6-G: Cleanup script | [x] | acee574 | 2026-02-13 | scripts/cleanup-attachments.ts |

Legend: `[x]` complete, `[~]` in progress, `[ ]` not started, `[!]` blocked

---

## H) Gotchas & Notes

1. **HEIC on iPhone**: Accept and upload, but browser can't render preview natively. Show placeholder icon. Azure vision handles HEIC via signed URL.
2. **Serverless body size**: Upload goes through dedicated `/api/chat/upload` route with `FormData`, NOT through the chat message endpoint. This avoids Next.js default body size limits on the chat route.
3. **Signed URL expiry**: Thumbnails use 10-min signed URLs. Vision extraction uses 5-min signed URLs. Both are short-lived and non-cacheable.
4. **localStorage expiry vs DB records**: When localStorage chat expires after 24h, the `chat_attachments` DB record still exists. The cleanup script handles DB records after 7 days. No orphan issues.
5. **Azure API version**: The existing `2024-02-15-preview` version supports vision via the ChatCompletions API with `image_url` content type. No version change needed.
