# Vectorius (Next.js Refactor from Figma Export)

> Status: Codex is currently working on this repository.

This repo contains a **production‑ready Next.js + Tailwind CSS** refactor of your Figma‑generated UI.
It preserves the look & feel (cards, gradients, glassmorphism) and reorganizes the codebase into a maintainable structure that’s ready to connect to **Supabase** and **Azure OpenAI**.

## What you get

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** with design tokens from Figma mapped to CSS variables
- A reusable **UI library** (shadcn-style) under `components/ui`
- Role-based dashboards: **Student**, **Parent**, **Advisor**
- **Login screen** (client-side navigation to role dashboards)
- **Top/Side/Bottom navigation** + floating AI chat drawer
- Clean imports (Radix/Lucide/Recharts without version suffixes)
- CI-ready structure and professional `.gitignore`

> This refactor removes Vite, lifts components into a Next.js App Router layout,
> and keeps your custom CSS tokens/gradients intact.

---

## Quick start

```bash
# Node 20+ recommended
npm install
npm run dev
# open http://localhost:3000
```

Routes:
- `/login`
- `/student`
- `/parent`
- `/advisor`
- `/(dash)/[role]` – the shared dynamic route used by the 3 pages above

---

## Project structure

```
app/
  layout.tsx              # global shell and styles
  page.tsx                # simple home with links
  (auth)/login/page.tsx   # login screen
  (dash)/[role]/layout.tsx
  (dash)/[role]/page.tsx  # renders Student/Parent/Advisor dashboard

components/
  TopNavigation.tsx
  Sidebar.tsx
  BottomNavigation.tsx
  StudentDashboard.tsx
  ParentDashboard.tsx
  AdvisorDashboard.tsx
  ChatInterface.tsx
  FloatingChatDrawer.tsx
  LoginScreen.tsx
  WeeklyPlanner.tsx
  ClassSetupModal.tsx
  ui/*                    # shadcn-style primitives (button, card, badge, etc.)

app/globals.css           # Tailwind base + your tokens/utilities (from Figma)
tailwind.config.ts        # maps Tailwind colors to CSS variables
postcss.config.js
next.config.ts
tsconfig.json
```

---

## Design tokens & theming

All tokens come from `app/globals.css`:

- CSS variables (light/dark) for background, foreground, card, primary, etc.
- Gradient helpers: `.bg-gradient-primary`, `.bg-gradient-card`, …
- Glassmorphism helpers, spacing utilities, sticky-note colors, etc.

Tailwind is configured to map semantic color classes:
- `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`,  
- `bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`, etc.

---

## What changed vs Figma export

- **Vite ➜ Next.js** (App Router)
- **Imports normalized**: removed version-suffixed imports like `@radix-ui/react-slot@1.1.2` → `@radix-ui/react-slot`
- **Components moved**: from `src/components/*` to `components/*`
- **Global styles**: consolidated in `app/globals.css` (kept your tokens/utilities)
- **Routing**: role is represented by URL (`/student`, `/parent`, `/advisor`), not local state
- **Client boundaries**: interactive components are marked with `"use client"`

---

## Next steps (hooking data & AI)

1. **Mock data extraction**  
   Move inline arrays from the dashboards into `lib/mock/*.ts`.  
   (You can keep visuals identical while preparing for Supabase.)

2. **Supabase integration**  
   - Add `lib/supabaseClient.ts` and swap mock reads for DB queries.
   - Set RLS policies for Students/Parents/Advisors.
   - Store chat transcripts in a `messages` table.

3. **Azure OpenAI**  
   - Create `/app/api/chat/route.ts` to call your Azure deployment.
   - Pass contextual data (assignments, notes) for better responses.

4. **Auth**  
   - Use Supabase Auth; derive role from user metadata.
   - Redirect `/login` based on role to the correct dashboard.

---

## Scripts

- `npm run dev` – run locally
- `npm run build` – production build
- `npm run start` – start production server
- `npm run lint` – Next.js lint rules
- `npm run type-check` – strict TypeScript check

---

## How to run scripts/supa-migrate.ps1

```powershell
.\scripts\supa-migrate.ps1 <migration_name>
```

Example:

```powershell
.\scripts\supa-migrate.ps1 add_last_seen_at_to_profiles
```

---

## Notes

- The CSS file from Figma (`src/index.css`) was **not** copied; Tailwind will generate needed utilities.
- If a specific visual looks off, it’s usually a missing custom class. Those live in `app/globals.css`.
- All Radix & Lucide imports were normalized; ensure `npm install` resolves them.

---

## License

MIT – use, modify, and ship.

## Database & Supabase Workflow

Supabase schema is treated as code.

Rules:
- All schema changes are SQL migrations in /supabase/migrations
- Never edit committed migrations
- UI changes must be followed by `supabase db pull`
- Apply changes via `supabase db push`
- Migrations are committed with app code

Supabase UI is for inspection, not source of truth.
