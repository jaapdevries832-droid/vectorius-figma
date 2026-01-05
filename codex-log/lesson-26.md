Lesson 26 - Parent Auth UI

Summary
- Added a Supabase client plus minimal parent sign-in/sign-up and protected parent page flows.
- Removed the legacy /(auth)/login route to avoid duplicate /login routing.

Files created
- app/login/page.tsx
- app/parent/page.tsx
- lib/supabase/client.ts

Updated files
- package.json
- package-lock.json

Removed files
- app/(auth)/login/page.tsx

Validation
- npm run lint
- npm run build
