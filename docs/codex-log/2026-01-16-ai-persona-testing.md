# AI Persona Testing Implementation

**Date**: 2026-01-16
**Branch**: `lesson-51`
**Commit Range**: `dc086a6` → `a8981e2`

---

## Overview

Implemented a system that allows AI agents (like ChatGPT in agent mode) to authenticate into the Vectorius app as specific test personas via magic links. This enables automated UX testing where an AI can browse the real application UI and provide feedback.

---

## Problem Statement

ChatGPT's browser agent mode cannot:
1. Execute JavaScript (so localStorage-based auth doesn't work)
2. Complete OAuth flows or fill complex login forms
3. Maintain sessions across page navigations without cookies

The app used Supabase Auth with client-side session storage (localStorage), which is inaccessible to AI agents.

---

## Solution Architecture

```
1. Admin generates token    →  npx tsx scripts/generate-persona-token.ts
                                     ↓
2. Token stored in DB       →  persona_tokens table (single-use, expires 24h)
                                     ↓
3. AI visits magic link     →  /api/auth/persona?token=xxx
                                     ↓
4. Server validates token   →  Checks expiry, single-use, gets user
                                     ↓
5. Server creates session   →  Supabase admin.generateLink() + verifyOtp()
                                     ↓
6. Session set in cookies   →  HTTP cookies (no JS required)
                                     ↓
7. Redirect to dashboard    →  /student, /parent, or /advisor
                                     ↓
8. Middleware refreshes     →  middleware.ts reads cookies on each request
                                     ↓
9. Browser client reads     →  createBrowserClient() reads from cookies
```

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260116021147_persona_tokens.sql` | Database table for storing magic link tokens |
| `supabase/migrations/20260116050938_add_test_personas.sql` | Creates test persona profiles and relationships |
| `lib/supabase/server.ts` | Server-side Supabase client with service role key |
| `lib/supabase/middleware.ts` | Middleware helper for cookie-based auth |
| `middleware.ts` | Next.js middleware to refresh sessions from cookies |
| `app/api/auth/persona/route.ts` | Magic link endpoint that creates sessions |
| `scripts/generate-persona-token.ts` | CLI script to generate tokens |
| `docs/ai-testing/persona-testing-guide.md` | User documentation |

### Modified Files

| File | Change |
|------|--------|
| `lib/supabase/client.ts` | Changed from `createClient` to `createBrowserClient` from `@supabase/ssr` |
| `package.json` | Added `@supabase/ssr`, `dotenv-cli`, `tsx` dependencies |

---

## Key Technical Decisions

### 1. Cookie-Based Auth (not localStorage)

**Problem**: AI agents can't execute JavaScript, so localStorage is inaccessible.

**Solution**: Use HTTP cookies which are set by the server and sent automatically with every request.

```typescript
// Set cookies in the format @supabase/ssr expects
response.cookies.set(baseCookieName, `base64-${base64Session}`, {
  path: "/",
  sameSite: "lax",
  httpOnly: false,  // Browser client needs to read these
  secure: true,
  maxAge: 60 * 60 * 24 * 7,
});
```

### 2. Using @supabase/ssr Package

**Problem**: Default Supabase client only reads from localStorage.

**Solution**: Switch to `createBrowserClient` from `@supabase/ssr` which can read from both localStorage AND cookies.

```typescript
// Before
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(url, key);

// After
import { createBrowserClient } from "@supabase/ssr";
export const supabase = createBrowserClient(url, key);
```

### 3. Middleware for Session Refresh

**Problem**: Sessions in cookies need to be refreshed to stay valid.

**Solution**: Next.js middleware that runs on every request and refreshes the session.

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookies) { /* set on response */ },
    },
  });

  // This refreshes the session
  await supabase.auth.getUser();

  return response;
}
```

### 4. Request Host for Redirects (not VERCEL_URL)

**Problem**: `VERCEL_URL` returns the deployment-specific URL (e.g., `vectorius-figma-k1ha7ev85-...`) not the branch alias URL.

**Solution**: Use the request's `host` header to stay on the same domain.

```typescript
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
```

### 5. Single-Use Tokens with Expiration

**Security measures**:
- Tokens are marked as `used` after first use
- Tokens expire after 24 hours (configurable)
- Endpoint blocked in production (`VERCEL_ENV === 'production'`)

---

## Database Schema

### persona_tokens Table

```sql
CREATE TABLE persona_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  persona_name TEXT NOT NULL,
  role TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Service role only (no public access)
ALTER TABLE persona_tokens ENABLE ROW LEVEL SECURITY;
```

---

## Test Personas Created

| Persona | Role | Email | User UID |
|---------|------|-------|----------|
| Maya (7th Grade Student) | student | maya.test@vectorius.local | `860b887a-521d-42b9-a8c9-308144fc0e64` |
| Sarah (Parent) | parent | sarah.test@vectorius.local | `09345bb5-e880-441f-88b1-d39ca655d6c3` |
| Michael (Advisor) | advisor | michael.test@vectorius.local | `8bab11ff-be97-4a6e-b38b-e8224932bb96` |

**Relationships**:
- Sarah is linked to Maya via `student_parent` table
- Michael is linked to Maya via `student_advisor` table (primary advisor)

---

## Environment Variables Required

```env
# Already existed
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# New - add to .env.local AND Vercel Preview environment
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Supabase Configuration Required

### Redirect URLs

Add to **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**:

```
https://vectorius-figma-git-*-jaap-de-vries-projects.vercel.app/**
```

This allows all branch preview deployments to receive auth redirects.

---

## Usage

### Generate a Token

```bash
npx dotenv -e .env.local -- npx tsx scripts/generate-persona-token.ts \
  --user-id "860b887a-521d-42b9-a8c9-308144fc0e64" \
  --persona "maya-7th-grader" \
  --role "student" \
  --base-url "https://vectorius-figma-git-lesson-51-jaap-de-vries-projects.vercel.app"
```

### Give to ChatGPT

```
Go to https://vectorius-figma-git-lesson-51-jaap-de-vries-projects.vercel.app/api/auth/persona?token=xxx
and explore the student dashboard as Maya, a 7th grade student. Report any UX issues you find.
```

---

## Security Considerations

1. **Production blocked**: Returns 403 if `VERCEL_ENV === 'production'`
2. **Single-use tokens**: Each token can only be used once
3. **24-hour expiration**: Tokens automatically expire
4. **Service role key protected**: Only used server-side, never exposed to browser
5. **RLS on token table**: No public access to `persona_tokens` table
6. **Test data isolation**: Test personas use `.local` email domains

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Missing token parameter" | URL has no `?token=` | Include full URL with token |
| "Token has already been used" | Single-use enforcement | Generate a new token |
| "Token has expired" | 24h TTL exceeded | Generate a new token |
| Redirects to login page | Cookie not set or read | Check middleware is deployed, verify `createBrowserClient` is used |
| Redirects to wrong URL | `VERCEL_URL` used | Fixed: now uses request host |
| "Persona testing is disabled" | Running on production | Only works on preview deployments |

---

## Commits

1. `dc086a6` - feat: add AI persona magic links for automated UX testing
2. `4c6e295` - fix: use direct session injection for persona auth
3. `a402743` - feat: add SSR auth support for AI persona testing
4. `2b9fff1` - fix: use request host for redirects instead of VERCEL_URL
5. `a8981e2` - fix: use createBrowserClient for cookie-based auth support

---

## Future Improvements

- [ ] Add admin UI for generating tokens (instead of CLI)
- [ ] Add session recording to track AI agent actions
- [ ] Add experience report submission endpoint
- [ ] Support for more granular persona attributes (grade level, preferences)
- [ ] Automated token cleanup for expired tokens
