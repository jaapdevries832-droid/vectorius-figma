# Update Notes

**Refactor date:** 2025-09-05

This package is a cleaned and production-ready refactor of the Figma export.

## Highlights
- Migrated from **Vite** to **Next.js (App Router)** with **TypeScript**
- Adopted **Tailwind CSS** (kept your tokens/gradients in `app/globals.css`)
- Normalized imports (removed version suffixes in all `@radix-ui/*`, `lucide-react`, `react-day-picker`, etc.)
- Component library moved to `components/ui/*` (shadcn-style)
- Role-based routing: `/student`, `/parent`, `/advisor`
- Interactive components marked with `"use client"`

## Known good practices included
- Strict TypeScript
- `.gitignore` with Node/Next/Vercel entries
- Minimal `next.config.ts` for typed routes
- Clear project structure for future Supabase + Azure OpenAI integration

## Next steps (suggested)
- Extract inline mock data into `lib/mock/` modules
- Add Supabase client and auth; move role to user metadata
- Add `/app/api/chat/route.ts` with Azure OpenAI calls
- Introduce Storybook for `components/ui/*` if desired
